/**
 * A "machineRetriever" is simply an async function that is given
 * a name of a function and returns a StateMachine.
 */
let machineRetriever = null;

if (process.env.MACHINE_LOCATOR === undefined)
    throw new Error(`No MACHINE_LOCATOR defined`);

switch (process.env.MACHINE_LOCATOR) {
    case 'LOCAL_FS':
        console.log('Using local machine locator');
        machineRetriever = require('./localRetriever');
        break;
    default:
        throw new Error(
            `Unrecognized MACHINE_LOCATOR: ${process.env.MACHINE_LOCATOR}`,
        );
}

module.exports = machineRetriever;
