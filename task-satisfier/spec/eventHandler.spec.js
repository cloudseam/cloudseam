const eventHandler = require('../src/eventHandler');

describe('eventHandler', () => {
    let event, satisfier, responseSender;

    beforeEach(() => {
        event = {
            stack: { id: 'master' },
            task: {
                name: 'sample-task',
                executor: 'lambda',
                config: {
                    name: 'sample-task',
                },
            },
        };

        satisfier = jasmine
            .createSpy('satisfier')
            .and.returnValue(Promise.resolve());

        responseSender = {
            sendSuccess: jasmine
                .createSpy('responseSender.sendSuccess')
                .and.returnValue(Promise.resolve()),
            sendError: jasmine
                .createSpy('responseSender.sendError')
                .and.returnValue(Promise.resolve()),
        };
    });

    it('sends success when satisfying completes successfully', async () => {
        await eventHandler(event, satisfier, responseSender);

        expect(satisfier).toHaveBeenCalledWith(event.stack, event.task);
        expect(responseSender.sendSuccess).toHaveBeenCalledWith(
            event.stack.id,
            event.task,
        );
        expect(responseSender.sendError).not.toHaveBeenCalled();
    });

    it('sends error when satisfying fails via Promise rejection', async () => {
        const error = new Error('An (expected) ERROR has occurred');
        satisfier = jasmine
            .createSpy('satisfier')
            .and.returnValue(Promise.reject(error));

        await eventHandler(event, satisfier, responseSender);

        expect(satisfier).toHaveBeenCalledWith(event.stack, event.task);
        expect(responseSender.sendSuccess).not.toHaveBeenCalled();
        expect(responseSender.sendError).toHaveBeenCalledWith(
            event.stack.id,
            event.task,
            error.stack,
        );
    });
});
