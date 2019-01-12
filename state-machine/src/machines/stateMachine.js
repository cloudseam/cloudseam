/**
 * Representation of a state machine in which its configuration and states
 * are derived solely through configuration.
 */
class StateMachine {
    constructor(configuration) {
        this.stateConfig = configuration.states;

        // Add `name` to the tasks using the key
        this.taskConfig = Object.keys(configuration.tasks)
            .map(taskName =>
                Object.assign({}, configuration.tasks[taskName], {
                    name: taskName,
                }),
            )
            .reduce((total, curr) => ({ [curr.name]: curr, ...total }), {});
    }

    processAction(stack, action) {
        const state = this._getState(stack.state);

        if (state.on === undefined || state.on[action] === undefined) {
            throw new Error(
                `Action '${action}' is not available on stack '${
                    stack.id
                }' while in state '${stack.state}'`,
            );
        }

        this._processStateAction(stack, state.on[action]);
    }

    satisfyTask(stack, task) {
        console.log(`Satisfying task ${task} for stack ${stack.id}`);
        stack.satisfyTask(task);

        if (stack.isSatisfied() && !this.isTerminalState(stack.state)) {
            this.processAction(stack, 'NEXT');
        }
    }

    getTask(taskName) {
        return this.taskConfig[taskName];
    }

    isTerminalState(stateName) {
        return this.stateConfig[stateName].terminal === true;
    }

    _processStateAction(stack, actionConfig) {
        for (let i = 0; i < actionConfig.length; i++) {
            switch (actionConfig[i].action) {
                case 'advance':
                    this._setState(stack, actionConfig[i].state);
                    break;
            }
        }
    }

    _setState(stack, newStateName) {
        stack.resetTasks();
        stack.state = newStateName;

        const newState = this._getState(newStateName);
        if (newState.tasks) newState.tasks.forEach(task => stack.addTask(task));
    }

    _getState(stateName) {
        const state = this.stateConfig[stateName];
        if (state === undefined)
            throw new Error(`Unknown state requested: ${stateName}`);
        return state;
    }
}

module.exports = StateMachine;
