const sqsClient = require('./aws').sqsClient;

function sendSuccess(stackId, task) {
    return sendMessage('TASK_COMPLETED', stackId, task);
}

function sendError(stackId, task, message) {
    return sendMessage('TASK_ERROR', stackId, task, {
        description: message,
    });
}

function sendMessage(action, stackId, task, extraData = {}) {
    const messageBody = JSON.stringify({
        event: action,
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
