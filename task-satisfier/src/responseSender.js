const defaultSqsClient = require('./aws').sqsClient;

function sendSuccess(stackId, requirement, sqsClient = defaultSqsClient) {
    return sendMessage('TASK_COMPLETED', stackId, requirement, sqsClient);
}

function sendError(stackId, task, message, sqsClient = defaultSqsClient) {
    return sendMessage('TASK_ERROR', stackId, requirement, sqsClient, {
        description: message,
    });
}

function sendMessage(action, stackId, requirement, sqsClient, extraData = {}) {
    const messageBody = JSON.stringify({
        action,
        stackId,
        requirement,
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
