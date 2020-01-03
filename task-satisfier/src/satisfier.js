const executors = require('./executors');

async function satisfier(stack, task) {
    console.log(`[satisfier] Satisfying task ${task.name} of ${stack.id}`);

    if (executors[task.executor] === undefined) {
        throw new Error(
            `Unable to satisfy task. Executor '${
                task.executor
            }' not recognized`,
        );
    }

    return executors[task.executor](stack, task);
}

module.exports = satisfier;
