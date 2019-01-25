const Stack = require('../src/stack');

describe('Stack', () => {
    let stack;

    beforeEach(() => {
        stack = new Stack('stack1', 'test-machine');
    });

    it('constructs correctly by default', () => {
        expect(stack.id).toBe('stack1');
        expect(stack.state).toBe('INIT');
        expect(stack.machine).toBe('test-machine');
        expect(stack.isSatisfied()).toBe(true);
        expect(stack.previousState).toBe(null);
    });

    it('constructs correctly when state specified', () => {
        stack = new Stack('stack2', 'test-machine', 'LAUNCH');
        expect(stack.id).toBe('stack2');
        expect(stack.machine).toBe('test-machine');
        expect(stack.state).toBe('LAUNCH');
    });

    it('keeps track of previous states', () => {
        stack.state = 'LAUNCH';
        expect(stack.state).toBe('LAUNCH');
        expect(stack.previousState).toBe('INIT');

        stack.state = 'RUN';
        expect(stack.state).toBe('RUN');
        expect(stack.previousState).toBe('LAUNCH');
    });

    it('serializes and reconstructs correctly', () => {
        stack.metadata = { name: 'Test' };
        stack.addTask('req1');

        const serialized = JSON.stringify(stack);
        const recovered = Stack.fromJson(serialized);

        expect(recovered.metadata).toEqual({ name: 'Test' });
        expect(recovered.state).toBe('INIT');
        expect(recovered.id).toBe('stack1');
        expect(recovered.satisfied).toBe(false);
        expect(recovered.hasTask('req1')).toBe(true);
    });

    describe('metadata handling', () => {
        it('sets metadata correctly on first set', () => {
            stack.addMetadata({ test: 123 });

            expect(stack.metadata.test).toBe(123);
        });

        it('sets metadata correctly on subsequent setting', () => {
            stack.addMetadata({ test: 123, test2: 123 });
            stack.addMetadata({ test2: 234 });

            expect(stack.metadata.test).toBe(123);
            expect(stack.metadata.test2).toBe(234);
        });

        it('throws when metadata is not a flat object', () => {
            try {
                stack.addMetadata({ test: { value: 123 } });
                fail('Should have thrown');
            } catch (err) {
                expect(err.message).toContain('must be a flat object');
            }
        });
    });

    describe('tasks handling', () => {
        it('adds tasks', () => {
            stack.addTask('cert-provision');
            expect(stack.isSatisfied()).toBe(false);
            expect(stack.satisfied).toBe(false);
        });

        it('satisfies tasks', () => {
            stack.addTask('cert-provision');

            stack.satisfyTask('cert-provision');
            expect(stack.satisfied).toBe(true);
            expect(stack.isSatisfied()).toBe(true);
        });

        it('works with multiple tasks', () => {
            stack.addTask('cert-provision');
            stack.addTask('db-setup');

            stack.satisfyTask('db-setup');
            expect(stack.satisfied).toBe(false);
            expect(stack.isSatisfied()).toBe(false);

            stack.satisfyTask('cert-provision');
            expect(stack.satisfied).toBe(true);
            expect(stack.isSatisfied()).toBe(true);
        });

        it('throws when satisfying an unrecognized task', () => {
            try {
                stack.satisfyTask('unknown');
                fail('should have thrown');
            } catch (err) {
                expect(err.message).toContain('unknown');
            }
        });

        it('answers hasTask correctly', () => {
            stack.addTask('req1');
            expect(stack.hasTask('req1')).toBe(true);

            stack.addTask('req2');
            expect(stack.hasTask('req1')).toBe(true);
            expect(stack.hasTask('req2')).toBe(true);
        });

        it("doesn't indicate it has a task when it's already been satisfied", () => {
            stack.addTask('req1');
            stack.addTask('req2');
            stack.satisfyTask('req1');

            expect(stack.hasTask('req1')).toBe(false);
        });

        it('getTasks works as expected', () => {
            expect(stack.getPendingTasks().map(t => t.name).length).toBe(0);

            stack.addTask('req1');
            expect(stack.getPendingTasks().map(t => t.name).length).toBe(1);
            expect(stack.getPendingTasks().map(t => t.name)).toContain('req1');

            stack.addTask('req2');
            expect(stack.getPendingTasks().map(t => t.name).length).toBe(2);
            expect(stack.getPendingTasks().map(t => t.name)).toContain('req1');
            expect(stack.getPendingTasks().map(t => t.name)).toContain('req2');

            stack.satisfyTask('req1');
            expect(stack.getPendingTasks().map(t => t.name).length).toBe(1);
            expect(stack.getPendingTasks().map(t => t.name)).toContain('req2');
        });

        it("throws when adding a task that's already been defined", () => {
            stack.addTask('req1');

            try {
                stack.addTask('req1');
                fail('Should have thrown');
            } catch (err) {
                expect(err.message).toContain("Task 'req1' already defined");
            }
        });

        it('handles errors correctly', () => {
            stack.addTask('req1');

            stack.indicateTaskFailure('req1', 'An error occurred');

            expect(stack.tasks[0].errorMessage).toBe('An error occurred');
            expect(stack.getPendingTasks().map(t => t.name).length).toBe(1);
            expect(stack.hasError()).toBe(true);
        });

        it('handles errors correctly', () => {
            stack.addTask('req1');

            stack.indicateTaskFailure('req1', 'An error occurred');
            stack.satisfyTask('req1');

            expect(stack.tasks[0].errorMessage).toBe(undefined);
            expect(stack.getPendingTasks().map(t => t.name).length).toBe(0);
            expect(stack.hasError()).toBe(false);
        });

        it('resets failed tasks correctly', () => {
            stack.addTask('req1');

            stack.indicateTaskFailure('req1', 'An error occurred');
            stack.resetFailedTasks();

            expect(stack.hasError()).toBe(false);
            expect(stack.tasks[0].status).toBe('PENDING');
            expect(stack.tasks[0].errorMessage).toBe(undefined);
        });
    });
});
