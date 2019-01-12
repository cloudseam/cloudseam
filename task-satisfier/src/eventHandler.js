const defaultResponseSender = require('./responseSender');
const defaultSatisfier = require('./satisfier');

async function eventHandler(
    event,
    satisfier = defaultSatisfier,
    responseSender = defaultResponseSender,
) {
    try {
        await satisfier(event.stack, event.task);
        return responseSender.sendSuccess(event.stack.id, event.task);
    } catch (err) {
        console.error(err);
        return responseSender.sendError(
            event.stack.id,
            event.task,
            err.message,
        );
    }
}

module.exports = eventHandler;
