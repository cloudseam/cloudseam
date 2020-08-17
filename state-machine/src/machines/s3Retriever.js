const fs = require('fs');
const path = require('path');
const YAML = require('yamljs');
const StateMachine = require('./stateMachine');
const validateMachine = require('@cloudseam/machine-validator');
const { s3 } = require('../aws');

async function getSourceFromS3(bucket, key, workDir) {
    console.log(`Using specs from bucket ${bucket} and key ${key}`);
    console.log(`Caching in ${workDir}`);
    const objects = await s3
        .listObjectsV2({
            Bucket: bucket,
            Prefix: key,
        })
        .promise();

    const files = objects.Contents.filter(o => o.Size !== 0).map(o => o.Key);
    console.log(`Found files: ${files}`);

    const filenames = [];
    for (let i = 0; i < files.length; i++) {
        const response = await s3
            .getObject({
                Bucket: bucket,
                Key: files[i],
            })
            .promise();

        let filename = files[i].substr(key.length);
        fs.writeFileSync(`${workDir}/${filename}`, response.Body);
        filenames.concat(filename);
    }
    return filenames;
}

async function getMachines() {
    const bucket = process.env.MACHINE_S3_BUCKET;
    const key = process.env.MACHINE_S3_KEY;
    const dirName = fs.mkdtempSync(path.join(os.tmpdir(), 'machine-specs-');
    const files = await getSourceFromS3(bucket, key, dirName);

    return fs
        .readdirSync(dirName)
        .map(file => [path.parse(file).name, YAML.load(`${dirName}/${file}`)])
        .map(([filename, config]) => [
            filename,
            new Promise(acc =>
                validateMachine(config).then(config =>
                    acc(new StateMachine(config)),
                ),
            ),
        ])
        .reduce(
            (val, [filename, machine]) =>
                Object.assign({}, val, {
                    [filename]: machine,
                }),
            {},
        );
}

const machinePromise = getMachines();

async function getMachine(name) {
    const machines = await machinePromise;
    return machines[name];
}

module.exports = getMachine;
