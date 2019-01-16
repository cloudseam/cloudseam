const YAML = require('yamljs');
const schemaValidator = require('../../../../src/machines/schemas/versionOne');

describe('versionOne schema', () => {
    let machineData;

    beforeEach(() => {
        machineData = YAML.load(__dirname + '/valid.yml');
    });

    it('works with valid document', async () => {
        const schema = await schemaValidator(machineData);
        expect(schema).not.toBeUndefined();

        const result = schema;
        expect(result.error).toBe(null);
    });

    it('fails when INIT state not defined', async () => {
        delete machineData.states.INIT;

        const result = await schemaValidator(machineData);
        expect(result.error).not.toBe(null);
        expect(result.error.message).toContain(
            'An `INIT` state must be defined',
        );
    });

    it('fails when event not defined in top-level events field', async () => {
        const firstEvent = machineData.events[0];
        machineData.events = machineData.events.slice(1);

        const result = await schemaValidator(machineData);
        expect(result.error).not.toBe(null);
        expect(result.error.message).toContain(
            `"${firstEvent}" is not allowed`,
        );
    });

    it('fails when event does not match the expected pattern', async () => {
        machineData.events.push('aNewEvent');

        const result = await schemaValidator(machineData);
        expect(result.error).not.toBe(null);
        expect(result.error.message).toContain(
            `"aNewEvent" fails to match the required pattern`,
        );
    });

    it('fails when state tries to advance to state that does not exist', async () => {
        machineData.states.PROVISION.on.NEXT[0].state = 'DOES_NOT_EXIST';

        const result = await schemaValidator(machineData);
        expect(result.error).not.toBe(null);
        expect(result.error.message).toContain(`"state" must be one of`);
    });

    it('fails when state references a non-existing task', async () => {
        machineData.states.PROVISION.tasks = ['DOES_NOT_EXIST'];

        const result = await schemaValidator(machineData);
        expect(result.error).not.toBe(null);
        expect(result.error.message).toContain(
            `"tasks" at position 0 fails because ["0" must be one of`,
        );
    });

    it('fails when state name does not match correct pattern', async () => {
        machineData.states.aNewMachine = { on: { NEXT: [] } };
        const result = await schemaValidator(machineData);
        expect(result.error).not.toBe(null);
        expect(result.error.message).toContain(
            '"aNewMachine" fails to match the required pattern',
        );
    });

    describe('state definition', () => {
        it('allows NEXT action to be defined, even when not an explicit event', async () => {
            machineData.states['NEW-STATE'] = { on: { NEXT: [] } };
            const result = await schemaValidator(machineData);
            expect(result.error).toBe(null);
        });

        it('fails when event not recognized', async () => {
            machineData.states.NEW = { on: { UNKNOWN: [] } };
            const result = await schemaValidator(machineData);
            expect(result.error).not.toBe(null);
            expect(result.error.message).toContain('"UNKNOWN" is not allowed');
        });

        it('allows advance actions when state specified', async () => {
            machineData.states.NEW = {
                on: {
                    NEXT: [{ action: 'advance', state: 'RUN' }],
                },
            };

            const result = await schemaValidator(machineData);
            expect(result.error).toBe(null);
        });

        it('fails when advance action uses unrecognized state', async () => {
            machineData.states.NEW = {
                on: {
                    NEXT: [{ action: 'advance', state: 'RUNN' }],
                },
            };

            const result = await schemaValidator(machineData);
            expect(result.error).not.toBe(null);
            expect(result.error.message).toContain('"state" must be one of');
        });

        it('fails when state advancing to in action is not recognized', async () => {
            machineData.states.NEW = {
                on: {
                    NEXT: [{ action: 'UNKNOWN' }],
                },
            };

            const result = await schemaValidator(machineData);
            expect(result.error).not.toBe(null);
            expect(result.error.message).toContain('"action" must be one of');
        });

        it('allows no-op action types', async () => {
            machineData.states.NEW = {
                on: {
                    NEXT: [{ action: 'no-op' }],
                },
            };

            const result = await schemaValidator(machineData);
            expect(result.error).toBe(null);
        });
    });

    it('requires tasks to have valid executor', async () => {
        machineData.tasks.test = { executor: 'unknown' };
        const result = await schemaValidator(machineData);
        expect(result.error).not.toBe(null);
        expect(result.error.message).toContain('"executor" must be one of');
    });

    describe('terraform tasks', () => {
        let terraformTask;

        beforeEach(() => {
            terraformTask = {
                executor: 'terraform',
                config: {
                    source: {
                        type: 's3',
                        bucket: 'test',
                        key: 'test',
                    },
                    action: 'apply',
                },
            };
        });

        it('works on valid input', async () => {
            machineData.tasks.test = terraformTask;

            const result = await schemaValidator(machineData);
            expect(result.error).toBe(null);
        });

        it('requires the s3 bucket to be defined', async () => {
            delete terraformTask.config.source.bucket;
            machineData.tasks.test = terraformTask;

            const result = await schemaValidator(machineData);
            expect(result.error).not.toBe(null);
            expect(result.error.message).toContain('"bucket" is required');
        });

        it('requires the s3 key to be defined', async () => {
            delete terraformTask.config.source.key;
            machineData.tasks.test = terraformTask;

            const result = await schemaValidator(machineData);
            expect(result.error).not.toBe(null);
            expect(result.error.message).toContain('"key" is required');
        });

        it('requires the action to be defined', async () => {
            delete terraformTask.config.action;
            machineData.tasks.test = terraformTask;

            const result = await schemaValidator(machineData);
            expect(result.error).not.toBe(null);
            expect(result.error.message).toContain('"action" is required');
        });

        it('allows action to be destroy', async () => {
            terraformTask.config.action = 'destroy';
            machineData.tasks.test = terraformTask;

            const result = await schemaValidator(machineData);
            expect(result.error).toBe(null);
        });

        it('fails when action not apply or destroy', async () => {
            terraformTask.config.action = 'unknown';
            machineData.tasks.test = terraformTask;

            const result = await schemaValidator(machineData);
            expect(result.error).not.toBe(null);
            expect(result.error.message).toContain(
                '"action" must be one of [apply, destroy]',
            );
        });

        it('allows local source type', async () => {
            terraformTask.config.source = { type: 'local', location: '' };

            const result = await schemaValidator(machineData);
            expect(result.error).toBe(null);
        });

        it('requires a location on the local source type', async () => {
            terraformTask.config.source = { type: 'local' };

            const result = await schemaValidator(machineData);
            expect(result.error).not.toBe(null);
            expect(result.error.message).toContain('asdf');
        });
    });

    describe('lambda tasks', () => {
        let lambdaTask;

        beforeEach(() => {
            lambdaTask = {
                executor: 'lambda',
                config: { name: 'test-lambda' },
            };
        });

        it('works on valid input', async () => {
            machineData.tasks.test = lambdaTask;

            const result = await schemaValidator(machineData);
            expect(result.error).toBe(null);
        });

        it('requires a name', async () => {
            delete lambdaTask.config.name;
            machineData.tasks.test = lambdaTask;

            const result = await schemaValidator(machineData);
            expect(result.error).not.toBe(null);
            expect(result.error.message).toContain('"name" is required');
        });
    });
});
