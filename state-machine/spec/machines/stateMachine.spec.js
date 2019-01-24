const StateMachine = require('../../src/machines/stateMachine');
const Stack = require('../../src/stack');

describe('StateMachine', () => {
    let stateMachine, config, stack;

    beforeEach(() => {
        config = {
            states: {
                INIT: {
                    tasks: [],
                    on: { LAUNCH: [{ action: 'advance', state: 'PROVISION' }] },
                },
                PROVISION: {
                    tasks: ['setup-machines'],
                    on: { NEXT: [{ action: 'advance', state: 'LAUNCH' }] },
                },
                LAUNCH: {
                    tasks: ['launch-tasks'],
                    on: { NEXT: [{ action: 'advance', state: 'RUN' }] },
                },
                RUN: {
                    tasks: [],
                    on: {},
                },
            },
            tasks: {},
        };

        stateMachine = new StateMachine(config);
        stack = new Stack('master', 'prod', 'INIT');
    });

    it('advances to provision with onLaunch', () => {
        stateMachine.processAction(stack, 'LAUNCH');

        expect(stack.state).toBe('PROVISION');
        expect(stack.isSatisfied()).toBe(false);
        expect(stack.hasTask('setup-machines')).toBe(true);
    });

    it('advances automatically when all tasks completed', () => {
        stateMachine.processAction(stack, 'LAUNCH');
        config.states.PROVISION.tasks.forEach(task =>
            stateMachine.satisfyTask(stack, task),
        );

        expect(stack.state).toBe(config.states.PROVISION.on.NEXT[0].state);
        expect(stack.isSatisfied()).toBe(false);
        expect(stack.hasTask('launch-tasks')).toBe(true);
    });

    it('indicates task failures correctly', () => {
        stateMachine.processAction(stack, 'LAUNCH');

        stateMachine.indicateTaskFailure(
            stack,
            config.states.PROVISION.tasks[0],
            'An error',
        );

        expect(stack.state).toBe('PROVISION');
        expect(stack.isSatisfied()).toBe(false);
        expect(stack.hasError()).toBe(true);
    });
});
