const responseSender = require('../src/responseSender');

describe('responseSender', () => {
    let sqsClient;
    const stackId = 'master';
    const task = {};

    beforeEach(() => {
        sqsClient = {
            sendMessage: jasmine.createSpy('sendMessage').and.returnValue({
                promise: () => Promise.resolve(),
            }),
        };
    });

    it('sends success messages correctly', async () => {
        await responseSender.sendSuccess(stackId, task, sqsClient);

        const body = {
            event: 'TASK_COMPLETED',
            stackId,
            task,
        };

        expect(sqsClient.sendMessage).toHaveBeenCalledWith({
            QueueUrl: process.env.SQS_EVENT_QUEUE_URL,
            MessageBody: JSON.stringify(body),
        });
    });

    it('sends error messages correctly', async () => {
        const errorMessage = 'An error has occurred';
        await responseSender.sendError(stackId, task, errorMessage, sqsClient);

        const body = {
            event: 'TASK_ERROR',
            stackId,
            task,
            description: errorMessage,
        };

        expect(sqsClient.sendMessage).toHaveBeenCalledWith({
            QueueUrl: process.env.SQS_EVENT_QUEUE_URL,
            MessageBody: JSON.stringify(body),
        });
    });
});
