/**
 * A simple utility script, meant to be executed directly, to
 * validate the schema for a directory of machine specs.
 */

const fs = require('fs');
const YAML = require('yamljs');
const validator = require('@cloudseam/machine-validator');

if (process.argv.length < 3) {
    return exitWithError('Usage: node validate.js spec_directory');
}

const dirName = process.argv[2];
if (!fs.existsSync(dirName)) {
    return exitWithError(`Specified directory could not be found`);
}
run()
    .then(() => console.log('Good to go!'))
    .catch(() => {
        console.error('VALIDATION FAILURE');
        process.exit(1);
    });

async function run() {
    console.log(`Looking through ${dirName}\n`);

    const machineFiles = fs
        .readdirSync(dirName)
        .map(name => `${dirName}/${name}`);

    let hasError = false;
    for (let i = 0; i < machineFiles.length; i++) {
        console.log(`Validating ${machineFiles[i]}`);
        const config = YAML.load(machineFiles[i]);
        try {
            await validator(config);
        } catch (err) {
            hasError = true;
            console.error(err.message);
        }
        console.log();
    }

    if (hasError) throw new Error('Validation failed');
}

function exitWithError(message) {
    console.error(message);
    process.exit(1);
}
