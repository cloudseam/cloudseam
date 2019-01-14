const satisfier = require('../src/satisfier');

describe('satisfier', () => {
    let executors, stack, task;

    beforeEach(() => {
        executors = {
            terraform: jasmine
                .createSpy('executors.terraform')
                .and.callFake(() => Promise.resolve()),
        };

        stack = { id: 'stack-123' };

        task = {
            name: 'sample-task',
            executor: 'terraform',
        };
    });

    it('throws if task has unknown executor', async () => {
        task.executor = 'unknown';

        try {
            await satisfier(stack, task, executors);
            fail('Should have thrown');
        } catch (err) {
            expect(err.message).toContain(
                "Unable to satisfy task. Executor 'unknown' not recognized",
            );
        }
    });

    it('fires action and sends message afterwards', async () => {
        await satisfier(stack, task, executors);

        expect(executors.terraform).toHaveBeenCalledWith(stack, task);
    });
});
