const TaskStatus = {
    PENDING: 'PENDING',
    SATISFIED: 'SATISFIED',
    ERROR: 'ERROR',
};

class Stack {
    static from(data) {
        return Object.setPrototypeOf(data, Stack.prototype);
    }

    static fromJson(jsonData) {
        return Stack.from(JSON.parse(jsonData));
    }

    constructor(id, machine, state = 'INIT') {
        this.id = id;
        this.previousState = null;
        this.machine = machine;
        this.state = state;
        this.tasks = [];
        this.metadata = {};
    }

    isSatisfied() {
        return (
            this.tasks.filter(r => r.status !== TaskStatus.SATISFIED).length ===
            0
        );
    }

    hasError() {
        return this.tasks.filter(r => r.status === TaskStatus.ERROR).length > 0;
    }

    addTask(name) {
        if (this.tasks.find(r => r.name === name) !== undefined)
            throw new Error(`Task '${name}' already defined`);

        this.tasks = [...this.tasks, { name, status: 'PENDING' }];
    }

    hasTask(name) {
        return (
            this.tasks.filter(
                r => r.name === name && r.status !== TaskStatus.SATISFIED,
            ).length === 1
        );
    }

    resetTasks() {
        this.tasks = [];
    }

    satisfyTask(name) {
        const taskIndex = this._getTaskIndex(name);

        this.tasks = [
            ...this.tasks.slice(0, taskIndex),
            Object.assign({}, this.tasks[taskIndex], {
                status: TaskStatus.SATISFIED,
                errorMessage: undefined,
            }),
            ...this.tasks.slice(taskIndex + 1),
        ];
    }

    indicateTaskFailure(name, description) {
        const taskIndex = this.tasks.findIndex(r => r.name === name);

        this.tasks = [
            ...this.tasks.slice(0, taskIndex),
            Object.assign({}, this.tasks[taskIndex], {
                status: TaskStatus.ERROR,
                errorMessage: description,
            }),
            ...this.tasks.slice(taskIndex + 1),
        ];
    }

    _getTaskIndex(name) {
        const taskIndex = this.tasks.findIndex(r => r.name === name);
        if (taskIndex === -1)
            throw new Error(`Unable to find task with name: ${name}`);
        return taskIndex;
    }

    hasTasks() {
        return this.getPendingTasks().length > 0;
    }

    getTasks() {
        return this.tasks;
    }

    getPendingTasks() {
        return this.getTasks().filter(t => t.status !== TaskStatus.SATISFIED);
    }

    resetFailedTasks() {
        this.tasks = this.tasks.map(t =>
            t.status === TaskStatus.ERROR
                ? Object.assign({}, t, {
                      status: TaskStatus.PENDING,
                      errorMessage: undefined,
                  })
                : t,
        );
    }

    addMetadata(metadata) {
        if (metadata === undefined) return;

        const subObject = Object.keys(metadata).find(
            key => typeof metadata[key] === 'object' && metadata[key] !== null,
        );
        if (subObject !== undefined)
            throw new Error(`Provided metadata must be a flat object`);

        this.metadata = Object.assign({}, this.metadata, metadata);
    }

    get state() {
        return this._state;
    }

    set state(state) {
        this.previousState = this._state || null;
        this._state = state;
        this.tasks = [];
    }

    get satisfied() {
        return this.isSatisfied();
    }
}

module.exports = Stack;
