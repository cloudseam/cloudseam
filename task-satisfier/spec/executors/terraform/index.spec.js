const launcher = require('../../../src/executors/terraform');

let stackId = `test-${new Date().getTime()}`;
let stack, defaultTestTimeout, task;

beforeEach(() => {
    defaultTestTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

    stack = { id: stackId };
    task = {
        executor: 'terraform',
        name: 's3-test',
        config: {
            action: 'apply',
            source: {
                type: 'local',
                location: `${__dirname}/main.tf`,
            },
        },
    };
});

afterEach(() => (jasmine.DEFAULT_TIMEOUT_INTERVAL = defaultTestTimeout));

it('runs successfully for locally sourced files', async () => {
    return launcher(stack, task);
});
