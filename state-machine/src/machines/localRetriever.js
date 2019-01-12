const fs = require('fs');
const path = require('path');
const YAML = require('yamljs');
const StateMachine = require('./stateMachine');
const validateMachine = require('./validator');

const dirName = process.env.MACHINE_SPEC_DIR;

const localMachines = fs
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

const machines = Object.keys(localMachines);
console.log(`Found ${machines.length} machines:`, machines);

async function getMachine(name) {
    return localMachines[name];
}

module.exports = getMachine;
