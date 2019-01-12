const defaultSqsClient = require('./aws').sqs;

async function taskNotifier(stack, stateMachine, sqsClient = defaultSqsClient) {
    const tasks = stack.getRequirements();
    for (let i = 0; i < tasks.length; i++) {
        await sendMessage(
            {
                task: stateMachine.getTask(tasks[i]),
                stack,
            },
            sqsClient,
        );
    }
}

function sendMessage(messageBody, sqsClient) {
    if (messageBody instanceof Object)
        messageBody = JSON.stringify(messageBody);

    console.log(
        `Sending message to ${process.env.SQS_TASK_QUEUE_URL}`,
        messageBody,
    );

    return sqsClient
        .sendMessage({
            QueueUrl: process.env.SQS_TASK_QUEUE_URL,
            MessageBody: messageBody,
        })
        .promise();
}

module.exports = taskNotifier;
