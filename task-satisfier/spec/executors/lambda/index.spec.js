const lambdaExecutor = require('../../../src/executors/lambda');

describe('lambda executor', () => {
    let lambdaClient, stack, task;

    beforeEach(() => {
        lambdaClient = {
            invoke: jasmine.createSpy('lambda.invoke').and.returnValue({
                promise: () => Promise.resolve(),
            }),
        };

        stack = {
            id: 'master',
            metadata: {},
        };

        task = {
            config: {
                name: 'test-function',
            },
        };
    });

    it('invokes the lambda with correct payload', async () => {
        await lambdaExecutor(stack, task, lambdaClient);

        expect(lambdaClient.invoke).toHaveBeenCalledWith({
            FunctionName: task.config.name,
            Payload: `{"stackId":"${stack.id}","metadata":{}}`,
        });
    });
});
