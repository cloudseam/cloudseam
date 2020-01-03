const repo = require('./repo');
const taskNotifier = require('./taskNotifier');
const stackLocator = require('./stackLocator');
const machineRetriever = require('./machines');
const Stack = require('./stack');

/**
 * {
 *   event: "LAUNCH",
 *   stackId: "crest-1234",
 *   machine: "qa",
 *   task : { name : "ecs-setup", config : {}} // Only when action is TASK_COMPLETED
 * }
 */
async function eventHandler(eventRequest) {
    console.log(`Received event`, eventRequest);

    if (eventRequest.stackId === undefined)
        throw new Error(`Event missing required "stackId" property"`);
    if (eventRequest.action === undefined && eventRequest.event === undefined)
        throw new Error(`Event missing required "event" property"`);
    if (eventRequest.action === 'NEXT')
        throw new Error(`External triggering of the NEXT event is not allowed`);

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

    if (stack.isSatisfied() && machine.isTerminalState(stack.state)) {
        await repo.removeStack(stack);
        console.log(`Stack ${stack.id} has been removed`);
    }
}

module.exports = eventHandler;
