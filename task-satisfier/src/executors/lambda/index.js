const defaultLambdaClient = require('../../aws').lambda;

async function lambdaExecutor(stack, task, lambdaClient = defaultLambdaClient) {
    const payload = {
        stackId: stack.id,
        metadata: stack.metadata,
    };

    const params = {
        FunctionName: task.config.name,
        Payload: JSON.stringify(payload),
    };

    return lambdaClient
        .invoke(params)
        .promise()
        .then(data => {
            if (data.FunctionError) {
                const payload = JSON.parse(data.Payload);
                const message = `${payload.errorType}: ${
                    payload.errorMessage
                }\n${payload.trace.join('\n')}`;
                throw new Error(message);
            }
            return data.Payload;
        });
}

module.exports = lambdaExecutor;
