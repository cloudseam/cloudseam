const defaultRepo = require('./repo');
const Stack = require('./stack');

/**
 * Tries to find a stack with the provided ID. If one doesn't exist, it
 * will create but does NOT persist it.
 *
 * It is expected that stackIds are unique across all machines. Machines
 * don't serve as namespacing, so a `master` stack can only be defined once.
 * If a retrieved stack has a different machine name, an error is thrown (currently).
 * At some point, there may be the ability to upgrade/change the machine
 * being used.
 *
 * @param stackId {string} The id of the stack to retrieve/create
 * @param machineName {string} The name of the machine. Not always guaranteed to be
 *                             provided. But, is REQUIRED when creating a new stack.
 * @return {Stack} Either a newly created or pre-existing stack.
 */
async function stackLocator(stackId, machineName, repo = defaultRepo) {
    if (stackId === undefined)
        throw new Error(`Missing required "stackId" property`);

    let stack = await repo.findStack(stackId);
    if (stack === undefined) {
        if (machineName === undefined) {
            console.warn("Stack", stackId, "not found and no 'machine' specified");
            return;
        }
        stack = new Stack(stackId, machineName);
    }

    if (machineName !== undefined && stack.machine !== machineName) {
        throw new Error(
            `Machine in event (${machineName}) doesn't match configured stack ${
                stack.machine
            }`,
        );
    }

    return stack;
}

module.exports = stackLocator;
