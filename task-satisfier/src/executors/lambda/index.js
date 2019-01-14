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

    return lambdaClient.invoke(params).promise();
}

module.exports = lambdaExecutor;
