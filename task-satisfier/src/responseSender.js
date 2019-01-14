const defaultSqsClient = require('./aws').sqsClient;

function sendSuccess(stackId, task, sqsClient = defaultSqsClient) {
    return sendMessage('TASK_COMPLETED', stackId, task, sqsClient);
}

function sendError(stackId, task, message, sqsClient = defaultSqsClient) {
    return sendMessage('TASK_ERROR', stackId, task, sqsClient, {
        description: message,
    });
}

function sendMessage(action, stackId, task, sqsClient, extraData = {}) {
    const messageBody = JSON.stringify({
        action,
        stackId,
        task,
        ...extraData,
    });

    console.log(
        `Sending message to ${process.env.SQS_EVENT_QUEUE_URL}`,
        messageBody,
    );

    return sqsClient
        .sendMessage({
            QueueUrl: process.env.SQS_EVENT_QUEUE_URL,
            MessageBody: messageBody,
        })
        .promise();
}

module.exports = {
    sendSuccess,
    sendError,
};