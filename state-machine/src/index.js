const middy = require("@middy/core");
const sqsBatch = require("@middy/sqs-partial-batch-failure");
const eventHandler = require('./eventHandler');

function lambdaHandler(event, context) {
    console.log('Processing event', event);
    
    // This should normally only be one Record, but just in case...
    const recordPromises = event.Records.map(record => processRecord(record));
    return Promise.allSettled(recordPromises);
}

async function processRecord(record) {
    try {
        await eventHandler(JSON.parse(record.body));
        console.log('Event handling complete');
    } catch (err) {
        console.error(err);
        throw err;
    }
}

exports.lambdaHandler = middy(lambdaHandler)
    .use(sqsBatch());
