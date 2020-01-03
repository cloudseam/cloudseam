const sqsClient = require('../src/aws').sqsClient;
const responseSender = require('../src/responseSender');

jest.mock('../src/aws', () => ({
    sqsClient: {
        sendMessage: jest.fn().mockReturnValue({
            promise: () => Promise.resolve(),
        }),
    },
}));

const stackId = 'master';
const task = {};

afterEach(() => {
    sqsClient.sendMessage.mockClear();
});

it('sends success messages correctly', async () => {
    await responseSender.sendSuccess(stackId, task);

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
    await responseSender.sendError(stackId, task, errorMessage);

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
