const tmp = require('tmp');
const fs = require('fs');
const { spawn } = require('child_process');
const process = require('process');
const { s3 } = require('../../aws');

/**
 * Launch a Terraform script!
 * @param stack {object} The object
 * @param additionalFlags {object} Additional variables to define when launching
 * the script. Example { slug : 't-1234' } will add a `var='slug=t-1234'` flag
 * to the TF command
 */
async function terraformExecutor(stack, task) {
    if (process.env.LOCAL_MODE && process.env.SKIP_TASK_EXECUTION)
        return;

    const tmpDir = tmp.dirSync({ unsafeCleanup: true });
    const workDir = tmpDir.name;

    const stackMetadata = stack.metadata || {};
    const taskVariables = task.config.variables || {};

    const additionalVars = { ...stackMetadata, ...taskVariables };

    return Promise.all([
        copySourcesFiles(task.config.source, workDir),
        copyTerraformBinary(workDir),
    ])
        .then(() => init(workDir, stack, task))
        .then(() => run(workDir, task.config.action, stack.id, additionalVars))
        .then(() => tmpDir.removeCallback())
        .catch(e => {
            tmpDir.removeCallback();
            throw e;
        });
}

async function copySourcesFiles(sourceConfig, workDir) {
    if (sourceConfig.type === 's3')
        return getSourceFromS3(sourceConfig, workDir);
    else if (sourceConfig.type === 'local')
        return copyLocalFiles(sourceConfig, workDir);
    throw new Error(`Unsupported source type: ${sourceConfig.type}`);
}

async function getSourceFromS3(sourceConfig, workDir) {
    log(
        `Pulling files from bucket ${sourceConfig.bucket} with key ${
            sourceConfig.key
        }`,
    );
    const objects = await s3
        .listObjectsV2({
            Bucket: sourceConfig.bucket,
            Prefix: sourceConfig.key,
        })
        .promise();

    const files = objects.Contents.filter(o => o.Size !== 0).map(o => o.Key);
    log(`Found files: ${files}`);

    for (let i = 0; i < files.length; i++) {
        const response = await s3
            .getObject({
                Bucket: sourceConfig.bucket,
                Key: files[i],
            })
            .promise();

        let filename = files[i].substr(sourceConfig.key.length);
        fs.writeFileSync(`${workDir}/${filename}`, response.Body);
    }
}

async function copyLocalFiles(sourceConfig, workDir) {
    log(`Copying local files from ${sourceConfig.location} to ${workDir}`);
    return copyFiles(sourceConfig.location, workDir, workDir);
}

async function copyTerraformBinary(workDir) {
    log('Placing Terraform binary into /tmp/');
    if (fs.existsSync('/tmp/terraform')) return;

    return copyFiles(`${__dirname}/bin/terraform`, '/tmp/', workDir);
}

async function copyFiles(source, target, workDir) {
    return new Promise((accept, reject) => {
        const cmd = spawn('cp', ['-rv', source, target], {
            shell: true,
            cwd: workDir,
        });
        cmd.on('close', code => accept());
    });
}

async function init(workDir, stack, task) {
    return new Promise((accept, reject) => {
        const key = `${stack.machine}/${stack.id}/${task.config.source.key}`;
        log(`Initializing Terraform using backend config key=${key}`);

        const cmd = spawn(
            '/tmp/terraform',
            ['init', `-backend-config="key=${key}"`, workDir],
            { shell: true, cwd: workDir },
        );
        cmd.stdout.on('data', data => log(data.toString()));
        cmd.stderr.on('data', data => log(data.toString()));
        cmd.on('close', code => {
            if (code === 0) return accept();
            reject(new Error(`Unexpected error code: ${code}`));
        });
    });
}

async function run(workDir, action, stackId, additionalVariables) {
    return new Promise((accept, reject) => {
        let options = [
            action,
            `-var='stack_id=${stackId}'`,
            '-input=false',
            '-auto-approve',
        ];

        if (additionalVariables) {
            Object.keys(additionalVariables).forEach(key => {
                options.push(`-var='${key}=${additionalVariables[key]}'`);
            });
        }

        options.push(workDir);

        log(
            'Starting Terraform script with commands: ' +
                JSON.stringify(options),
        );

        const cmd = spawn('/tmp/terraform', options, {
            shell: true,
            cwd: workDir,
        });
        cmd.stdout.on('data', data => log(data.toString()));
        cmd.stderr.on('data', data => log(data.toString()));
        cmd.on('close', code => {
            log(`Terraform script completed with exit code ${code}`);
            if (code === 0) return accept();
            reject(new Error(`Unexpected error code: ${code}`));
        });
    });
}

function log(text) {
    console.log(`[terraform-launcher] - ${text.trim()}`);
}

module.exports = terraformExecutor;
