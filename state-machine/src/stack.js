class Stack {
    static fromJson(jsonData) {
        return Object.setPrototypeOf(JSON.parse(jsonData), Stack.prototype);
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
        return this.tasks.filter(r => !r.satisfied).length === 0;
    }

    addTask(name) {
        if (this.tasks.find(r => r.name === name) !== undefined)
            throw new Error(`Task '${name}' already defined`);

        this.tasks = [...this.tasks, { name, satisfied: false }];
    }

    hasTask(name) {
        return (
            this.tasks.filter(r => r.name === name && !r.satisfied).length === 1
        );
    }

    resetTasks() {
        this.tasks = [];
    }

    satisfyTask(name) {
        const taskIndex = this.tasks.findIndex(r => r.name === name);
        if (taskIndex === -1)
            throw new Error(`Unable to find task with name: ${name}`);

        this.tasks = [
            ...this.tasks.slice(0, taskIndex),
            Object.assign({}, this.tasks[taskIndex], {
                satisfied: true,
            }),
            ...this.tasks.slice(taskIndex + 1),
        ];
    }

    hasTasks() {
        return this.getTasks().length > 0;
    }

    getTasks() {
        return this.tasks.filter(r => !r.satisfied).map(r => r.name);
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
