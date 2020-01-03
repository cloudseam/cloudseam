const responseSender = require('./responseSender');
const satisfier = require('./satisfier');

async function eventHandler(event) {
    try {
        await satisfier(event.stack, event.task);
        return responseSender.sendSuccess(event.stack.id, event.task);
    } catch (err) {
        console.error(err);
        return responseSender.sendError(event.stack.id, event.task, err.stack);
    }
}

module.exports = eventHandler;
