const { sqsClient, s3 } = require('./aws');
const lambdaHandler = require('./').lambdaHandler;

if (process.env.SQS_TASK_QUEUE_URL === undefined) {
    throw new Error(`SQS_TASK_QUEUE_URL env variable not defined!`);
}

async function run() {
    try {
        const message = await getMessage();
        console.log('Received message from SQS', message);
        if (message.Messages === undefined) return;

        const lambdaMock = {
            Records: [{ body: message.Messages[0].Body }],
        };
        await lambdaHandler(lambdaMock);
        await deleteMessage(message.Messages[0].ReceiptHandle);

        setTimeout(() => run(), 1000);
    } catch (err) {
        console.error(err);
    }
}

function getMessage() {
    return sqsClient
        .receiveMessage({
            QueueUrl: process.env.SQS_TASK_QUEUE_URL,
            WaitTimeSeconds: 20,
        })
        .promise();
}

function deleteMessage(receiptHandle) {
    return sqsClient
        .deleteMessage({
            QueueUrl: process.env.SQS_TASK_QUEUE_URL,
            ReceiptHandle: receiptHandle,
        })
        .promise();
}

run();

process.on('SIGINT', () => process.exit());
