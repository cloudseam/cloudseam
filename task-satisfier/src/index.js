const eventHandler = require('./eventHandler');

async function lambdaHandler(event, context) {
    console.log('Processing event');
    console.log(event);

    const message = JSON.parse(event.Records[0].body);
    console.log('MESSAGE', message);
    try {
        await clearTmpDirectory();
        await eventHandler(message);
        console.log('Event handling complete');
    } catch (err) {
        console.error(err);
        throw err;
    }
}

async function clearTmpDirectory() {
    const { spawn } = require('child_process');

    return new Promise(accept => {
        const cmd = spawn('rm', ['-r', '-f', '/tmp/*'], { shell: true });
        cmd.on('close', code => accept());
    });
}

exports.lambdaHandler = lambdaHandler;
