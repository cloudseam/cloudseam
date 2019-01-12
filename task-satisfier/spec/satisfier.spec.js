const satisfier = require('../src/satisfier');

describe('satisfier', () => {
    let availableTasks, stack, sqsClient;

    beforeEach(() => {
        availableTasks = [
            {
                name: 'req1',
                action: jasmine
                    .createSpy('req1.action')
                    .and.returnValue(Promise.resolve()),
            },
        ];

        sqsClient = {
            sendMessage: jasmine
                .createSpy('sendMessage')
                .and.returnValue(Promise.resolve()),
        };

        stack = { id: 'stack-123' };
    });

    it('throws if requirement has no task handler', async () => {
        try {
            await satisfier(stack, 'unknown', availableTasks);
            fail('Should have thrown');
        } catch (err) {
            expect(err.message).toContain(
                "Unable to find handler for 'unknown'",
            );
        }
    });

    it('fires action and sends message afterwards', async () => {
        await satisfier(stack, 'req1', availableTasks, sqsClient);

        expect(availableTasks[0].action).toHaveBeenCalledWith(stack);
        expect(sqsClient.sendMessage).toHaveBeenCalledWith({
            action: 'SATISFY_REQ',
            requirement: 'req1',
            stackId: stack.id,
        });
    });
});
