const defaultMachines = require('./machines');
const defaultRepo = require('./repo');
const taskNotifier = require('./taskNotifier');
const defaultStackLocator = require('./stackLocator');
const defaultMachineRetriever = require('./machines');
const Stack = require('./stack');

/**
 * {
 *   action: "LAUNCH",
 *   stackId: "crest-1234",
 *   machine: "qa",
 *   task : { name : "ecs-setup", config : {}} // Only when action is TASK_COMPLETED
 * }
 */
async function eventHandler(
    event,
    machineRetriever = defaultMachineRetriever,
    repo = defaultRepo,
    stackLocator = defaultStackLocator,
) {
    console.log(`Received event`, event);

    const stack = await stackLocator(event.stackId, event.machine);
    stack.addMetadata(event.metadata);

    const machine = await machineRetriever(stack.machine);
    if (machine === undefined)
        throw new Error(`Unrecognized machine: ${stack.machine}`);

    const initialState = stack.state;

    switch (event.action) {
        case 'TASK_COMPLETED':
            machine.satisfyTask(stack, event.task.name);
            break;
        case 'TASK_ERROR':
            machine.indicateTaskFailure(
                stack,
                event.task.name,
                event.description,
            );
            break;
        default:
            machine.processAction(stack, event.action);
            break;
    }

    await repo.saveStack(stack);

    if (stack.state !== initialState && !stack.isSatisfied())
        await taskNotifier(stack, machine);

    if (stack.isSatisfied() && machine.isTerminalState(stack.state))
        await repo.removeStack(stack);
}

module.exports = eventHandler;
