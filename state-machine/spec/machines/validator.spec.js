const Joi = require('joi');
const validator = require('../../src/machines/validator');

describe('validator', () => {
    let machineData, schemaValidator;

    beforeEach(() => {
        machineData = {
            version: 1,
        };

        schemaValidator = async data => {
            const { error, value } = Joi.object({
                id: Joi.string().required(),
            })
                .unknown()
                .validate(data);
            return { error, value };
        };
    });

    it('throws when machine has unrecognized version', async () => {
        try {
            await validator(machineData, {});
            fail('Should have thrown error');
        } catch (err) {
            expect(err.message).toContain('Unsupported version number: 1');
        }
    });

    it('throws when data fails validation', async () => {
        try {
            const t = await validator(machineData, {
                1: schemaValidator,
            });
            console.log('T', t);
            fail('Should have thrown error');
        } catch (err) {
            expect(err.message).toContain('"id" is required');
        }
    });

    it('passes when validation is successful', async () => {
        machineData = Object.assign({}, machineData, { id: '123' });
        const result = await validator(machineData, {
            1: schemaValidator,
        });
        expect(result).not.toBeUndefined();
        expect(result).toEqual(machineData);
    });
});
