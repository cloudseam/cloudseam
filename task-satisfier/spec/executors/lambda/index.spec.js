const lambdaExecutor = require('../../../src/executors/lambda');

describe('lambda executor', () => {
    let lambdaClient, stack, task, invocationResult;

    beforeEach(() => {
        invocationResult = {
            Payload: JSON.stringify({ success: true }),
        };

        lambdaClient = {
            invoke: jasmine.createSpy('lambda.invoke').and.returnValue({
                promise: () => Promise.resolve(invocationResult),
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
        const result = await lambdaExecutor(stack, task, lambdaClient);

        expect(lambdaClient.invoke).toHaveBeenCalledWith({
            FunctionName: task.config.name,
            Payload: `{"stackId":"${stack.id}","metadata":{}}`,
        });
        expect(result).toEqual('{"success":true}');
    });

    // Documented https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-mode-exceptions.html
    it('handles lambda invocation errors correctly', async () => {
        invocationResult = {
            FunctionError: 'unhandled',
            Payload: JSON.stringify({
                errorType: 'ReferenceError',
                errorMessage: 'x is not defined',
                trace: ['Trace Line 1', 'Trace Line 2'],
            }),
        };

        try {
            result = await lambdaExecutor(stack, task, lambdaClient);
            fail('Should have thrown');
        } catch (e) {
            expect(e.message).toContain('ReferenceError');
            expect(e.message).toContain('x is not defined');
            expect(e.message).toContain('Trace Line 1');
            expect(e.message).toContain('Trace Line 2');
        }
    });
});
