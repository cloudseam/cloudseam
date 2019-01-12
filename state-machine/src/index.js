const eventHandler = require('./eventHandler');

async function lambdaHandler(event, context) {
    console.log('Processing event');
    const message = JSON.parse(event.Records[0].body);

    try {
        await eventHandler(message);
        console.log('Event handling complete');
    } catch (err) {
        console.error(err);
        throw err;
    }
}

exports.lambdaHandler = lambdaHandler;
