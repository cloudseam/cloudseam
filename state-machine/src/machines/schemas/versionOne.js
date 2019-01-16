const Joi = require('joi');

async function versionOneSchemaValidator(machineData) {
    const taskNames = Object.keys(machineData.tasks);
    const eventNames = machineData.events.concat('NEXT');
    const stateNames = Object.keys(machineData.states);

    if (stateNames.indexOf('INIT') === -1) {
        return { error: new Error('An `INIT` state must be defined') };
    }

    const eventNameValidation = Joi.validate(
        eventNames,
        Joi.array()
            .items(Joi.string().regex(/^[A-Z0-9-]+$/))
            .unique(),
    );

    if (eventNameValidation.error) {
        return { error: eventNameValidation.error };
    }

    const stateNameValidation = Joi.validate(
        stateNames,
        Joi.array()
            .items(Joi.string().regex(/^[A-Z0-9-]+$/))
            .unique(),
    );

    if (stateNameValidation.error) {
        return { error: stateNameValidation.error };
    }

    const stateActionSchema = Joi.array().items(
        Joi.alternatives().try(
            Joi.object().keys({
                action: Joi.string().valid('no-op'),
            }),
            Joi.object().keys({
                action: Joi.string().valid('advance'),
                state: Joi.string()
                    .valid(stateNames)
                    .required(),
            }),
        ),
    );

    const stateSchema = Joi.object().keys({
        terminal: Joi.bool().optional(),
        tasks: Joi.array().items(Joi.string().valid(taskNames)),
        on: Joi.object().pattern(
            Joi.string()
                .regex(/^[A-Z0-9-]+$/)
                .valid(eventNames),
            stateActionSchema,
        ),
    });

    const terraformTaskSchema = Joi.object().keys({
        executor: Joi.string().valid('terraform'),
        config: Joi.object({
            source: Joi.alternatives().try(
                Joi.object({
                    type: Joi.string().valid('s3'),
                    bucket: Joi.string().required(),
                    key: Joi.string().required(),
                }).required(),
                Joi.object({
                    type: Joi.string().valid('local'),
                    location: Joi.string().required(),
                }).required(),
            ),
            action: Joi.valid('apply', 'destroy').required(),
            variables: Joi.object().optional(),
        }),
    });

    const lambdaTaskSchema = Joi.object().keys({
        executor: Joi.string().valid('lambda'),
        config: Joi.object({
            name: Joi.string().required(),
        }),
    });

    const machineSchema = Joi.object({
        version: Joi.number()
            .valid(1)
            .required(),
        events: Joi.array()
            .items(Joi.string())
            .required(),
        states: Joi.object()
            .pattern(Joi.string(), stateSchema)
            .required(),
        tasks: Joi.object().pattern(
            Joi.string(),
            Joi.alternatives().try([terraformTaskSchema, lambdaTaskSchema]),
        ),
    }).pattern(/^x-/, Joi.any());

    // The result isn't _really_ a Promise, but has then/catch keys to mimic it.
    // Since this is an async function, the engine sees the then/catch
    // keys and treats it as a Promise, which changes the return type. So,
    // just extract the values we need and pass them along.
    const { error, value } = machineSchema.validate(machineData);
    return { error, value };
}

module.exports = versionOneSchemaValidator;
