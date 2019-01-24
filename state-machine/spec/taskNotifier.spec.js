const taskNotifier = require('../src/taskNotifier');

describe('taskNotifier', () => {
    let stack, stackMachine, tasks, sqsClient;

    beforeEach(() => {
        tasks = [
            { name: 'task1', status: 'PENDING' },
            { name: 'task2', status: 'PENDING' },
            { name: 'task3', status: 'ERROR' },
        ];

        stack = {
            getTasks: jasmine
                .createSpy('stack.getTasks')
                .and.returnValue(tasks),
        };

        sqsClient = {
            sendMessage: jasmine
                .createSpy('sqsClient.sendMessage')
                .and.returnValue({
                    promise: () => Promise.resolve(),
                }),
        };

        stateMachine = {
            getTask: jasmine
                .createSpy('stateMachine.getTask')
                .and.callFake(task => tasks.find(t => t.name === task.name)),
        };
    });

    it('sends messages to all accepted tasks', async () => {
        await taskNotifier(
            stack,
            stateMachine,
            t => t.status === 'PENDING',
            sqsClient,
        );

        expect(sqsClient.sendMessage).toHaveBeenCalledTimes(2);

        expect(sqsClient.sendMessage).toHaveBeenCalledWith({
            QueueUrl: process.env.SQS_TASK_QUEUE_URL,
            MessageBody: JSON.stringify({
                task: tasks[0],
                stack,
            }),
        });

        expect(sqsClient.sendMessage).toHaveBeenCalledWith({
            QueueUrl: process.env.SQS_TASK_QUEUE_URL,
            MessageBody: JSON.stringify({
                task: tasks[1],
                stack,
            }),
        });
    });
});
