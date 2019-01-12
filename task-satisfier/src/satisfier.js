const defaultExecutors = require('./executors');

async function satisfier(stack, task, executors = defaultExecutors) {
    console.log(`[satisfier] Satisfying requirement ${task} of ${stack.id}`);

    if (executors[task.executor] === undefined) {
        throw new Error(
            `Unable to satisfy task. Executor ${task.executor} not recognized`,
        );
    }

    return executors[task.executor](stack, task);
}

module.exports = satisfier;
