const taskNotifier = require('../src/taskNotifier');
const sqsClient = require('../src/aws').sqs;

jest.mock('../src/aws', () => ({
    sqs: {
        sendMessage: jest.fn().mockReturnValue({
            promise: () => Promise.resolve(),
        }),
    },
}));

let stack, stackMachine, mockTasks;

beforeEach(() => {
    mockTasks = [
        { name: 'task1', status: 'PENDING' },
        { name: 'task2', status: 'PENDING' },
        { name: 'task3', status: 'ERROR' },
    ];

    stack = {
        getTasks: jest.fn().mockImplementation(() => mockTasks),
    };

    stateMachine = {
        getTask: jest
            .fn()
            .mockImplementation(taskName =>
                mockTasks.find(t => t.name === taskName),
            ),
    };
});

it('sends messages to all accepted tasks', async () => {
    await taskNotifier(stack, stateMachine, t => t.status === 'PENDING');

    expect(sqsClient.sendMessage).toHaveBeenCalledTimes(2);

    expect(sqsClient.sendMessage).toHaveBeenCalledWith({
        QueueUrl: process.env.SQS_TASK_QUEUE_URL,
        MessageBody: JSON.stringify({
            task: mockTasks[0],
            stack,
        }),
    });

    expect(sqsClient.sendMessage).toHaveBeenCalledWith({
        QueueUrl: process.env.SQS_TASK_QUEUE_URL,
        MessageBody: JSON.stringify({
            task: mockTasks[1],
            stack,
        }),
    });
});
