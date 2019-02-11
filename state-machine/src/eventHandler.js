const defaultMachines = require('./machines');
const defaultRepo = require('./repo');
const defaultTaskNotifier = require('./taskNotifier');
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
    eventRequest,
    machineRetriever = defaultMachineRetriever,
    repo = defaultRepo,
    stackLocator = defaultStackLocator,
    taskNotifier = defaultTaskNotifier,
) {
    console.log(`Received event`, eventRequest);

    if (eventRequest.stackId === undefined)
        throw new Error(`Event missing required "stackId" property"`);
    if (eventRequest.action === undefined)
        throw new Error(`Event missing required "action" property"`);

    const stack = await stackLocator(
        eventRequest.stackId,
        eventRequest.machine,
    );
    stack.addMetadata(eventRequest.metadata);

    const machine = await machineRetriever(stack.machine);
    if (machine === undefined)
        throw new Error(`Unrecognized machine: ${stack.machine}`);

    const initialState = stack.state;

    const event = eventRequest.event || eventRequest.action;

    switch (event) {
        case 'TASK_COMPLETED':
            machine.satisfyTask(stack, eventRequest.task.name);
            break;
        case 'TASK_ERROR':
            machine.indicateTaskFailure(
                stack,
                eventRequest.task.name,
                eventRequest.description,
            );
            break;
        case 'RETRY_FAILED_TASKS':
            await taskNotifier(stack, machine, t => t.status === 'ERROR');
            stack.resetFailedTasks();
            break;
        case 'RETRY_PENDING_TASKS':
            await taskNotifier(stack, machine, t => t.status === 'PENDING');
            break;
        default:
            machine.processAction(stack, event);
            break;
    }

    await repo.saveStack(stack);

    if (stack.state !== initialState && !stack.isSatisfied())
        await taskNotifier(stack, machine, t => t.status === 'PENDING');

    if (stack.isSatisfied() && machine.isTerminalState(stack.state))
        await repo.removeStack(stack);
}

module.exports = eventHandler;
