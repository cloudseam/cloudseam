const repo = require('../src/repo');
const taskNotifier = require('../src/taskNotifier');
const stackLocator = require('../src/stackLocator');
const machineRetriever = require('../src/machines');

const eventHandler = require('../src/eventHandler');

const taskName = 'sample-task';

let mockMachine,
    taskNotifyingFn,
    mockStack,
    request,
    satisfied,
    inTerminalState,
    processActionFn;

jest.mock('../src/machines', () =>
    jest.fn().mockImplementation(() => Promise.resolve(mockMachine)),
);
jest.mock('../src/taskNotifier', () =>
    jest.fn().mockImplementation((stack, machine, fn) => {
        taskNotifyingFn = fn;
        return Promise.resolve();
    }),
);
jest.mock('../src/stackLocator', () =>
    jest.fn().mockImplementation(() => Promise.resolve(mockStack)),
);
jest.mock('../src/repo', () => ({
    saveStack: jest.fn().mockResolvedValue(Promise.resolve()),
    removeStack: jest.fn().mockResolvedValue(Promise.resolve()),
}));

beforeEach(() => {
    satisfied = true;
    inTerminalState = false;
    processActionFn = () => Promise.resolve();

    mockMachine = {
        satisfyTask: jest.fn(),
        indicateTaskFailure: jest.fn(),
        processAction: jest
            .fn()
            .mockImplementation(stack => processActionFn(stack)),
        isTerminalState: jest.fn().mockImplementation(() => inTerminalState),
    };

    mockStack = {
        addMetadata: jest.fn(),
        resetFailedTasks: jest.fn(),
        isSatisfied: jest.fn().mockImplementation(() => satisfied),
        machine: 'qa',
        id: 'master',
        state: 'INIT',
    };

    repo.saveStack.mockResolvedValue(Promise.resolve());
    repo.removeStack.mockResolvedValue(Promise.resolve());

    request = { stackId: mockStack.id, action: 'LAUNCH', machine: 'qa' };
});

afterEach(() => {
    repo.saveStack.mockClear();
    repo.removeStack.mockClear();
    taskNotifier.mockClear();
    stackLocator.mockClear();
    machineRetriever.mockClear();
});

it('fails when stackId not specified in event', async () => {
    request.stackId = undefined;
    await validateFailure('Event missing required "stackId" property');
});

it('fails when action/event not specified in event', async () => {
    request.action = undefined;
    await validateFailure('Event missing required "event" property');
});

it('fails when requested machine is not recognized', async () => {
    mockMachine = undefined;
    await validateFailure('Unrecognized machine: qa');
});

it('fails when action is NEXT', async () => {
    request.action = 'NEXT';
    await validateFailure(
        'External triggering of the NEXT event is not allowed',
    );
});

describe('using action (deprecated)', () => {
    it('handles TASK_COMPLETED events', async () => {
        request.task = { name: taskName };
        request.action = 'TASK_COMPLETED';

        await eventHandler(request);

        expect(mockMachine.satisfyTask).toBeCalledWith(mockStack, taskName);
        expect(repo.saveStack).toBeCalledWith(mockStack);
    });

    it('handles TASK_ERROR events', async () => {
        request.task = { name: taskName };
        request.action = 'TASK_ERROR';
        request.description = 'An error occurred';

        await eventHandler(request);

        expect(mockMachine.indicateTaskFailure).toBeCalledWith(
            mockStack,
            taskName,
            request.description,
        );
        expect(repo.saveStack).toBeCalledWith(mockStack);
    });

    it('handles RETRY_FAILED_TASKS events', async () => {
        request.task = { name: taskName };
        request.action = 'RETRY_FAILED_TASKS';

        await eventHandler(request);

        expect(taskNotifier).toBeCalled();
        expect(taskNotifyingFn({ status: 'ERROR' })).toBe(true);
        expect(taskNotifyingFn({ status: 'PENDING' })).toBe(false);
        expect(taskNotifyingFn({ status: 'COMPLETE' })).toBe(false);
        expect(mockStack.resetFailedTasks).toBeCalled();

        expect(repo.saveStack).toBeCalledWith(mockStack);
    });

    it('handles RETRY_PENDING_TASKS events', async () => {
        request.task = { name: taskName };
        request.action = 'RETRY_PENDING_TASKS';

        await eventHandler(request);

        expect(taskNotifier).toBeCalled();
        expect(taskNotifyingFn({ status: 'ERROR' })).toBe(false);
        expect(taskNotifyingFn({ status: 'PENDING' })).toBe(true);
        expect(taskNotifyingFn({ status: 'COMPLETE' })).toBe(false);

        expect(repo.saveStack).toBeCalledWith(mockStack);
    });

    describe('custom event handling', () => {
        beforeEach(() => {
            request.action = 'LAUNCH';
        });

        it('does the basics with no state change', async () => {
            await eventHandler(request);

            expect(mockMachine.processAction).toBeCalledWith(
                mockStack,
                request.action,
            );
            expect(repo.saveStack).toBeCalledWith(mockStack);
            expect(taskNotifier).not.toBeCalled();
        });

        it('does the basics with a satisfied state change', async () => {
            processActionFn = stack => {
                stack.state = 'UPDATED';
                return Promise.resolve();
            };

            await eventHandler(request);

            expect(mockMachine.processAction).toBeCalledWith(
                mockStack,
                request.action,
            );

            expect(mockStack.state).toBe('UPDATED');
            expect(repo.saveStack).toBeCalledWith(mockStack);
            expect(taskNotifier).not.toBeCalled();
        });

        it('sends tasks on state change and not satisfied', async () => {
            processActionFn = stack => {
                stack.state = 'UPDATED';
                return Promise.resolve();
            };
            satisfied = false;

            await eventHandler(request);

            expect(mockMachine.processAction).toBeCalledWith(
                mockStack,
                request.action,
            );

            expect(mockStack.state).toBe('UPDATED');
            expect(repo.saveStack).toBeCalledWith(mockStack);
            expect(taskNotifier).toBeCalled();
            expect(taskNotifyingFn({ status: 'ERROR' })).toBe(false);
            expect(taskNotifyingFn({ status: 'PENDING' })).toBe(true);
            expect(taskNotifyingFn({ status: 'COMPLETE' })).toBe(false);
        });

        it('removes the stack when satisfied and terminal', async () => {
            processActionFn = stack => {
                stack.state = 'DONE';
                return Promise.resolve();
            };
            inTerminalState = true;

            await eventHandler(request);

            expect(mockMachine.processAction).toBeCalledWith(
                mockStack,
                request.action,
            );

            expect(mockStack.state).toBe('DONE');
            expect(repo.saveStack).toBeCalledWith(mockStack);
            expect(repo.removeStack).toBeCalledWith(mockStack);
            expect(taskNotifier).not.toBeCalled();
        });
    });
});

describe('using event in payload', () => {
    it('handles TASK_COMPLETED events', async () => {
        request.task = { name: taskName };
        request.event = 'TASK_COMPLETED';

        await eventHandler(request);

        expect(mockMachine.satisfyTask).toBeCalledWith(mockStack, taskName);
        expect(repo.saveStack).toBeCalledWith(mockStack);
    });

    it('handles TASK_ERROR events', async () => {
        request.task = { name: taskName };
        request.event = 'TASK_ERROR';
        request.description = 'An error occurred';

        await eventHandler(request);

        expect(mockMachine.indicateTaskFailure).toBeCalledWith(
            mockStack,
            taskName,
            request.description,
        );
        expect(repo.saveStack).toBeCalledWith(mockStack);
    });

    it('handles RETRY_FAILED_TASKS events', async () => {
        request.task = { name: taskName };
        request.event = 'RETRY_FAILED_TASKS';

        await eventHandler(request);

        expect(taskNotifier).toBeCalled();
        expect(taskNotifyingFn({ status: 'ERROR' })).toBe(true);
        expect(taskNotifyingFn({ status: 'PENDING' })).toBe(false);
        expect(taskNotifyingFn({ status: 'COMPLETE' })).toBe(false);
        expect(mockStack.resetFailedTasks).toBeCalled();

        expect(repo.saveStack).toBeCalledWith(mockStack);
    });

    it('handles RETRY_PENDING_TASKS events', async () => {
        request.task = { name: taskName };
        request.event = 'RETRY_PENDING_TASKS';

        await eventHandler(request);

        expect(taskNotifier).toBeCalled();
        expect(taskNotifyingFn({ status: 'ERROR' })).toBe(false);
        expect(taskNotifyingFn({ status: 'PENDING' })).toBe(true);
        expect(taskNotifyingFn({ status: 'COMPLETE' })).toBe(false);

        expect(repo.saveStack).toBeCalledWith(mockStack);
    });

    describe('custom event handling', () => {
        beforeEach(() => {
            request.event = 'LAUNCH';
        });

        it('does the basics with no state change', async () => {
            await eventHandler(request);

            expect(mockMachine.processAction).toBeCalledWith(
                mockStack,
                request.action,
            );
            expect(repo.saveStack).toBeCalledWith(mockStack);
            expect(taskNotifier).not.toBeCalled();
        });

        it('does the basics with a satisfied state change', async () => {
            processActionFn = stack => {
                stack.state = 'UPDATED';
                return Promise.resolve();
            };

            await eventHandler(request);

            expect(mockMachine.processAction).toBeCalledWith(
                mockStack,
                request.action,
            );

            expect(mockStack.state).toBe('UPDATED');
            expect(repo.saveStack).toBeCalledWith(mockStack);
            expect(taskNotifier).not.toBeCalled();
        });

        it('sends tasks on state change and not satisfied', async () => {
            processActionFn = stack => {
                stack.state = 'UPDATED';
                return Promise.resolve();
            };
            satisfied = false;

            await eventHandler(request);

            expect(mockMachine.processAction).toBeCalledWith(
                mockStack,
                request.action,
            );

            expect(mockStack.state).toBe('UPDATED');
            expect(repo.saveStack).toBeCalledWith(mockStack);
            expect(taskNotifier).toBeCalled();
            expect(taskNotifyingFn({ status: 'ERROR' })).toBe(false);
            expect(taskNotifyingFn({ status: 'PENDING' })).toBe(true);
            expect(taskNotifyingFn({ status: 'COMPLETE' })).toBe(false);
        });

        it('removes the stack when satisfied and terminal', async () => {
            processActionFn = stack => {
                stack.state = 'DONE';
                return Promise.resolve();
            };
            inTerminalState = true;

            await eventHandler(request);

            expect(mockMachine.processAction).toBeCalledWith(
                mockStack,
                request.action,
            );

            expect(mockStack.state).toBe('DONE');
            expect(repo.saveStack).toBeCalledWith(mockStack);
            expect(repo.removeStack).toBeCalledWith(mockStack);
            expect(taskNotifier).not.toBeCalled();
        });
    });
});

async function validateFailure(description, runEvent = request) {
    try {
        await eventHandler(runEvent);
        fail('Should have failed');
    } catch (err) {
        expect(err.message).toContain(description);
        expect(repo.saveStack).not.toBeCalled();
    }
}
