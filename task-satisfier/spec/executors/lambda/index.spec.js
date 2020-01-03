const lambdaClient = require('../../../src/aws').lambda;
const lambdaExecutor = require('../../../src/executors/lambda');

jest.mock('../../../src/aws', () => ({
    lambda: {
        invoke: jest.fn().mockImplementation(() => ({
            promise: () => Promise.resolve(mockInvocationResult),
        })),
    },
}));

let stack, task, mockInvocationResult;

beforeEach(() => {
    mockInvocationResult = {
        Payload: JSON.stringify({ success: true }),
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
    const result = await lambdaExecutor(stack, task);

    expect(lambdaClient.invoke).toHaveBeenCalledWith({
        FunctionName: task.config.name,
        Payload: `{"stackId":"${stack.id}","metadata":{}}`,
    });
    expect(result).toEqual('{"success":true}');
});

// Documented https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-mode-exceptions.html
it('handles lambda invocation errors correctly', async () => {
    mockInvocationResult = {
        FunctionError: 'unhandled',
        Payload: JSON.stringify({
            errorType: 'ReferenceError',
            errorMessage: 'x is not defined',
            trace: ['Trace Line 1', 'Trace Line 2'],
        }),
    };

    try {
        result = await lambdaExecutor(stack, task);
        fail('Should have thrown');
    } catch (e) {
        expect(e.message).toContain('ReferenceError');
        expect(e.message).toContain('x is not defined');
        expect(e.message).toContain('Trace Line 1');
        expect(e.message).toContain('Trace Line 2');
    }
});
