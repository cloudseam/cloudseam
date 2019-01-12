const lambdaHandler = require('./').lambdaHandler;
const sqsClient = require('./aws').sqs;
const stackRepo = require('./repo');

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
    } catch (err) {
        console.error(err);
    } finally {
        setTimeout(() => run(), 1000);
    }
}

function getMessage() {
    return sqsClient
        .receiveMessage({
            QueueUrl: process.env.SQS_EVENT_QUEUE_URL,
            WaitTimeSeconds: 20,
        })
        .promise();
}

function deleteMessage(receiptHandle) {
    return sqsClient
        .deleteMessage({
            QueueUrl: process.env.SQS_EVENT_QUEUE_URL,
            ReceiptHandle: receiptHandle,
        })
        .promise();
}

stackRepo.setup().then(() => run());

process.on('SIGINT', () => process.exit());
