const executors = require('../src/executors');
const satisfier = require('../src/satisfier');

jest.mock('../src/executors', () => ({
    terraform: jest.fn().mockReturnValue(Promise.resolve()),
}));

let stack, task;

beforeEach(() => {
    stack = { id: 'stack-123' };

    task = {
        name: 'sample-task',
        executor: 'terraform',
    };
});

it('throws if task has unknown executor', async () => {
    task.executor = 'unknown';

    try {
        await satisfier(stack, task);
        fail('Should have thrown');
    } catch (err) {
        expect(err.message).toContain(
            "Unable to satisfy task. Executor 'unknown' not recognized",
        );
    }
});

it('fires action and sends message afterwards', async () => {
    await satisfier(stack, task);

    expect(executors.terraform).toHaveBeenCalledWith(stack, task);
});
