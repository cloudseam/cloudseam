const runTerraformScript = require('../../src/executors/terraform');

describe('terraform launcher', () => {
    let stackId = `test-${new Date().getTime()}`;
    let timeout;

    beforeEach(() => {
        timeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    });

    afterEach(() => (jasmine.DEFAULT_TIMEOUT_INTERVAL = timeout));

    it('runs successfully', async () => {
        if (
            process.env.SKIP_AWS_TESTS ||
            process.env.AWS_ACCESS_KEY_ID === undefined
        )
            return console.log('Skipping Terraform launcher test');

        return runTerraformScript('test', 'apply', stackId).then(() =>
            runTerraformScript('test', 'destroy', stackId),
        );
    });
});
