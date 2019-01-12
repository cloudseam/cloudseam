const tmp = require('tmp');
const { spawn } = require('child_process');
const process = require('process');

/**
 * Launch a Terraform script!
 * @param stack {object} The object
 * @param additionalFlags {object} Additional variables to define when launching
 * the script. Example { slug : 't-1234' } will add a `var='slug=t-1234'` flag
 * to the TF command
 */
async function terraformExecutor(stack, requirement) {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true });
    const workDir = tmpDir.name;

    if (process.env.LOCAL_MODE)
        return new Promise(acc => setTimeout(acc, Math.random() * 1000 + 3000));

    const stackMetadata = stack.metadata || {};
    const requirementVariables = requirement.config.variables || {};

    const additionalVars = { ...stackMetadata, ...requirementVariables };

    return Promise.all([
        getSourceFromS3(requirement.config.source, workDir),
        copyTerraformBinary(workDir),
    ])
        .then(() => init(workDir, stack, requirement))
        .then(() => run(workDir, action, stack.id, additionalVars))
        .then(() => tmpDir.removeCallback())
        .catch(e => {
            tmpDir.removeCallback();
            throw e;
        });
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

async function copyTerraformBinary(workDir) {
    return new Promise((accept, reject) => {
        log('Placing Terraform binary into /tmp/');
        const cmd = spawn('cp', ['-v', `${__dirname}/bin/terraform`, '/tmp/'], {
            shell: true,
            cwd: workDir,
        });
        cmd.on('close', code => accept());
    });
}

async function init(workDir, stack, requirement) {
    return new Promise((accept, reject) => {
        log('Initializing Terraform');

        const cmd = spawn(
            '/tmp/terraform',
            [
                'init',
                `-backend-config="key=${stack.machine}/${stack.id}/${
                    requirement.name
                }"`,
                workDir,
            ],
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
        let options = [action, `-var='stack_id=${stackId}'`, '-auto-approve'];

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
