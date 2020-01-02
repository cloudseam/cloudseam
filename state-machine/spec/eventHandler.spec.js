const eventHandler = require('../src/eventHandler');

describe('eventHandler', () => {
    const taskName = 'sample-task';

    let machineRetriever,
        machine,
        repo,
        taskNotifier,
        taskNotifyingFn,
        stackLocator,
        stack,
        request,
        satisfied,
        inTerminalState,
        processActionFn;

    beforeEach(() => {
        satisfied = true;
        inTerminalState = false;
        processActionFn = () => Promise.resolve();

        stack = {
            addMetadata: jasmine.createSpy('stack.addMetadata'),
            resetFailedTasks: jasmine.createSpy('stack.resetFailedTasks'),
            isSatisfied: jasmine
                .createSpy('stack.isSatisfied')
                .and.callFake(() => satisfied),
            machine: 'qa',
            id: 'master',
            state: 'INIT',
        };

        machine = {
            satisfyTask: jasmine.createSpy('machine.satisfyTask'),
            indicateTaskFailure: jasmine.createSpy(
                'machine.indicateTaskFailure',
            ),
            processAction: jasmine
                .createSpy('machine.processAction')
                .and.callFake(stack => processActionFn(stack)),
            isTerminalState: jasmine
                .createSpy('machine.isTerminalState')
                .and.callFake(() => inTerminalState),
        };

        stackLocator = jasmine
            .createSpy('stackLocator')
            .and.returnValue(Promise.resolve(stack));

        machineRetriever = jasmine
            .createSpy('machineRetriever')
            .and.callFake(() => Promise.resolve(machine));

        taskNotifier = jasmine
            .createSpy('taskNotifier')
            .and.callFake((stack, machine, fn) => {
                taskNotifyingFn = fn;
                return Promise.resolve();
            });

        repo = {
            saveStack: jasmine
                .createSpy('repo.saveStack')
                .and.returnValue(Promise.resolve()),
            removeStack: jasmine
                .createSpy('repo.removeStack')
                .and.returnValue(Promise.resolve()),
        };

        request = { stackId: stack.id, action: 'LAUNCH', machine: 'qa' };
    });

    it('fails when stackId not specified in event', async () => {
        request.stackId = undefined;
        await validateFailure('Event missing required "stackId" property');
    });

    it('fails when action/event not specified in event', async () => {
        request.action = undefined;
        await validateFailure('Event missing required "event" property');
    });

    it('fails when requested machine is not recognized', async () => {
        machine = undefined;
        await validateFailure('Unrecognized machine: qa');
    });

    it('fails when action is NEXT', async () => {
        request.action = 'NEXT';
        await validateFailure(
            'External triggering of the NEXT event is not allowed',
        );
    });

    describe('using action (deprecated)', () => {
        it('handles TASK_COMPLETED events', async () => {
            request.task = { name: taskName };
            request.action = 'TASK_COMPLETED';

            await run(request);

            expect(machine.satisfyTask).toHaveBeenCalledWith(stack, taskName);
            expect(repo.saveStack).toHaveBeenCalledWith(stack);
        });

        it('handles TASK_ERROR events', async () => {
            request.task = { name: taskName };
            request.action = 'TASK_ERROR';
            request.description = 'An error occurred';

            await run(request);

            expect(machine.indicateTaskFailure).toHaveBeenCalledWith(
                stack,
                taskName,
                request.description,
            );
            expect(repo.saveStack).toHaveBeenCalledWith(stack);
        });

        it('handles RETRY_FAILED_TASKS events', async () => {
            request.task = { name: taskName };
            request.action = 'RETRY_FAILED_TASKS';

            await run(request);

            expect(taskNotifier).toHaveBeenCalled();
            expect(taskNotifyingFn({ status: 'ERROR' })).toBe(true);
            expect(taskNotifyingFn({ status: 'PENDING' })).toBe(false);
            expect(taskNotifyingFn({ status: 'COMPLETE' })).toBe(false);
            expect(stack.resetFailedTasks).toHaveBeenCalled();

            expect(repo.saveStack).toHaveBeenCalledWith(stack);
        });

        it('handles RETRY_PENDING_TASKS events', async () => {
            request.task = { name: taskName };
            request.action = 'RETRY_PENDING_TASKS';

            await run(request);

            expect(taskNotifier).toHaveBeenCalled();
            expect(taskNotifyingFn({ status: 'ERROR' })).toBe(false);
            expect(taskNotifyingFn({ status: 'PENDING' })).toBe(true);
            expect(taskNotifyingFn({ status: 'COMPLETE' })).toBe(false);

            expect(repo.saveStack).toHaveBeenCalledWith(stack);
        });

        describe('custom event handling', () => {
            beforeEach(() => {
                request.action = 'LAUNCH';
            });

            it('does the basics with no state change', async () => {
                await run(request);

                expect(machine.processAction).toHaveBeenCalledWith(
                    stack,
                    request.action,
                );
                expect(repo.saveStack).toHaveBeenCalledWith(stack);
                expect(taskNotifier).not.toHaveBeenCalled();
            });

            it('does the basics with a satisfied state change', async () => {
                processActionFn = stack => {
                    stack.state = 'UPDATED';
                    return Promise.resolve();
                };

                await run(request);

                expect(machine.processAction).toHaveBeenCalledWith(
                    stack,
                    request.action,
                );

                expect(stack.state).toBe('UPDATED');
                expect(repo.saveStack).toHaveBeenCalledWith(stack);
                expect(taskNotifier).not.toHaveBeenCalled();
            });

            it('sends tasks on state change and not satisfied', async () => {
                processActionFn = stack => {
                    stack.state = 'UPDATED';
                    return Promise.resolve();
                };
                satisfied = false;

                await run(request);

                expect(machine.processAction).toHaveBeenCalledWith(
                    stack,
                    request.action,
                );

                expect(stack.state).toBe('UPDATED');
                expect(repo.saveStack).toHaveBeenCalledWith(stack);
                expect(taskNotifier).toHaveBeenCalled();
                expect(taskNotifyingFn({ status: 'ERROR' })).toBe(false);
                expect(taskNotifyingFn({ status: 'PENDING' })).toBe(true);
                expect(taskNotifyingFn({ status: 'COMPLETE' })).toBe(false);
            });

            it('removes the stack when satisfied and terminal', async () => {
                processActionFn = stack => {
                    stack.state = 'DONE';
                    return Promise.resolve();
                };
                inTerminalState = true;

                await run(request);

                expect(machine.processAction).toHaveBeenCalledWith(
                    stack,
                    request.action,
                );

                expect(stack.state).toBe('DONE');
                expect(repo.saveStack).toHaveBeenCalledWith(stack);
                expect(repo.removeStack).toHaveBeenCalledWith(stack);
                expect(taskNotifier).not.toHaveBeenCalled();
            });
        });
    });

    describe('using event in payload', () => {
        it('handles TASK_COMPLETED events', async () => {
            request.task = { name: taskName };
            request.event = 'TASK_COMPLETED';

            await run(request);

            expect(machine.satisfyTask).toHaveBeenCalledWith(stack, taskName);
            expect(repo.saveStack).toHaveBeenCalledWith(stack);
        });

        it('handles TASK_ERROR events', async () => {
            request.task = { name: taskName };
            request.event = 'TASK_ERROR';
            request.description = 'An error occurred';

            await run(request);

            expect(machine.indicateTaskFailure).toHaveBeenCalledWith(
                stack,
                taskName,
                request.description,
            );
            expect(repo.saveStack).toHaveBeenCalledWith(stack);
        });

        it('handles RETRY_FAILED_TASKS events', async () => {
            request.task = { name: taskName };
            request.event = 'RETRY_FAILED_TASKS';

            await run(request);

            expect(taskNotifier).toHaveBeenCalled();
            expect(taskNotifyingFn({ status: 'ERROR' })).toBe(true);
            expect(taskNotifyingFn({ status: 'PENDING' })).toBe(false);
            expect(taskNotifyingFn({ status: 'COMPLETE' })).toBe(false);
            expect(stack.resetFailedTasks).toHaveBeenCalled();

            expect(repo.saveStack).toHaveBeenCalledWith(stack);
        });

        it('handles RETRY_PENDING_TASKS events', async () => {
            request.task = { name: taskName };
            request.event = 'RETRY_PENDING_TASKS';

            await run(request);

            expect(taskNotifier).toHaveBeenCalled();
            expect(taskNotifyingFn({ status: 'ERROR' })).toBe(false);
            expect(taskNotifyingFn({ status: 'PENDING' })).toBe(true);
            expect(taskNotifyingFn({ status: 'COMPLETE' })).toBe(false);

            expect(repo.saveStack).toHaveBeenCalledWith(stack);
        });

        describe('custom event handling', () => {
            beforeEach(() => {
                request.event = 'LAUNCH';
            });

            it('does the basics with no state change', async () => {
                await run(request);

                expect(machine.processAction).toHaveBeenCalledWith(
                    stack,
                    request.action,
                );
                expect(repo.saveStack).toHaveBeenCalledWith(stack);
                expect(taskNotifier).not.toHaveBeenCalled();
            });

            it('does the basics with a satisfied state change', async () => {
                processActionFn = stack => {
                    stack.state = 'UPDATED';
                    return Promise.resolve();
                };

                await run(request);

                expect(machine.processAction).toHaveBeenCalledWith(
                    stack,
                    request.action,
                );

                expect(stack.state).toBe('UPDATED');
                expect(repo.saveStack).toHaveBeenCalledWith(stack);
                expect(taskNotifier).not.toHaveBeenCalled();
            });

            it('sends tasks on state change and not satisfied', async () => {
                processActionFn = stack => {
                    stack.state = 'UPDATED';
                    return Promise.resolve();
                };
                satisfied = false;

                await run(request);

                expect(machine.processAction).toHaveBeenCalledWith(
                    stack,
                    request.action,
                );

                expect(stack.state).toBe('UPDATED');
                expect(repo.saveStack).toHaveBeenCalledWith(stack);
                expect(taskNotifier).toHaveBeenCalled();
                expect(taskNotifyingFn({ status: 'ERROR' })).toBe(false);
                expect(taskNotifyingFn({ status: 'PENDING' })).toBe(true);
                expect(taskNotifyingFn({ status: 'COMPLETE' })).toBe(false);
            });

            it('removes the stack when satisfied and terminal', async () => {
                processActionFn = stack => {
                    stack.state = 'DONE';
                    return Promise.resolve();
                };
                inTerminalState = true;

                await run(request);

                expect(machine.processAction).toHaveBeenCalledWith(
                    stack,
                    request.action,
                );

                expect(stack.state).toBe('DONE');
                expect(repo.saveStack).toHaveBeenCalledWith(stack);
                expect(repo.removeStack).toHaveBeenCalledWith(stack);
                expect(taskNotifier).not.toHaveBeenCalled();
            });
        });
    });

    async function validateFailure(description, runEvent = request) {
        try {
            await run(runEvent);
            fail('Should have failed');
        } catch (err) {
            expect(err.message).toContain(description);
            expect(repo.saveStack).not.toHaveBeenCalled();
        }
    }

    async function run(event) {
        return eventHandler(
            event,
            machineRetriever,
            repo,
            stackLocator,
            taskNotifier,
        );
    }
});
