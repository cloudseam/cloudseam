const satisfier = require('../src/satisfier');
const responseSender = require('../src/responseSender');
const eventHandler = require('../src/eventHandler');

jest.mock('../src/responseSender', () => ({
    sendSuccess: jest.fn().mockReturnValue(Promise.resolve()),
    sendError: jest.fn().mockReturnValue(Promise.resolve()),
}));

jest.mock('../src/satisfier', () =>
    jest.fn().mockReturnValue(Promise.resolve()),
);

let event;

beforeEach(() => {
    event = {
        stack: { id: 'master' },
        task: {
            name: 'sample-task',
            executor: 'lambda',
            config: {
                name: 'sample-task',
            },
        },
    };
});

afterEach(() => {
    responseSender.sendSuccess.mockClear();
    responseSender.sendError.mockClear();
    satisfier.mockClear();
});

it('sends success when satisfying completes successfully', async () => {
    await eventHandler(event);

    expect(satisfier).toHaveBeenCalledWith(event.stack, event.task);
    expect(responseSender.sendSuccess).toHaveBeenCalledWith(
        event.stack.id,
        event.task,
    );
    expect(responseSender.sendError).not.toHaveBeenCalled();
});

it('sends error when satisfying fails via Promise rejection', async () => {
    const error = new Error('An (expected) ERROR has occurred');

    satisfier.mockReset();
    satisfier.mockReturnValue(Promise.reject(error));

    await eventHandler(event);

    expect(satisfier).toHaveBeenCalledWith(event.stack, event.task);
    expect(responseSender.sendSuccess).not.toHaveBeenCalled();
    expect(responseSender.sendError).toHaveBeenCalledWith(
        event.stack.id,
        event.task,
        error.stack,
    );

    satisfier.mockReset();
    satisfier.mockReturnValue(Promise.resolve());
});
