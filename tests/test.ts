import _ from 'underscore';
import assert from 'assert';
import path from 'path';
import 'mocha';

import CorporalTestRunner from './util/runner';
import { CorporalOptions } from '../index';

let _currentRunners: CorporalTestRunner[] = [];


/**
 * Kill all runners that were created in the previous test
 */
afterEach((callback) => {
    _.each(_currentRunners, (runner) => {
        runner.close();
    });
    _currentRunners = [];
    return callback();
});

describe('Command Loading', () => {

    it('loads commands from a directory', async () => {
        const runner = _createRunner({ commands: _commandDir('loads-commands-from-a-directory') });
        await runner.start();
        const { stdout, stderr } = await runner.exec('help');
        assert.ok(!stderr);
        assert.notStrictEqual(stdout.indexOf('help    :  Show a dialog of all available commands.'), -1);
        assert.notStrictEqual(stdout.indexOf('quit    :  Quit the interactive shell.'), -1);
        assert.notStrictEqual(stdout.indexOf('command1:  command1.'), -1);
        assert.notStrictEqual(stdout.indexOf('command2:  command2.'), -1);
    });

    it('fails when a command without a description is encountered', async () => {
        return new Promise<string>(async (resolve) => {
            const runner = _createRunner({ commands: _commandDir('fails-when-a-command-without-a-description-is-encountered') });
            await runner.start();

            // Keep track of all stderr output from the process. We are listening for an error
            let stderr = '';
            runner.on('stderr', (data) => {
                stderr += data;
            });

            runner.on('close', (code) => {
                assert.strictEqual(code, 8);
                assert.notStrictEqual(stderr.indexOf('Command "no-description" must have a description string'), -1);
                resolve();
            });
        });
    });

    it('fails when a command without an invoke method is encountered', () => {
        return new Promise<string>(async (resolve) => {
            const runner = _createRunner({ commands: _commandDir('fails-when-a-command-without-an-invoke-method-is-encountered') });
            await runner.start();

            // Keep track of all stderr output from the process. We are listening for an error
            let stderr = '';
            runner.on('stderr', (data) => {
                stderr += data;
            });

            runner.on('close', (code) => {
                assert.strictEqual(code, 8);
                assert.notStrictEqual(stderr.indexOf('Command "no-invoke-method" must have an invoke function'), -1);
                resolve();
            });
        });

    });

    it('does not load commands that are disabled', async () => {
        // Load from a directory with a failing command while disabling the failing command
        const runner1 = _createRunner({
            'commands': _commandDir('fails-when-a-command-without-an-invoke-method-is-encountered'),
            'disabled': ['no-invoke-method']
        });
        await runner1.start;
        const { stdout: stdout1, stderr: stderr1 } = await runner1.exec('help');
        assert.ok(!stderr1);
        assert.strictEqual(stdout1.indexOf('no-invoke-method'), -1);
        assert.notStrictEqual(stdout1.indexOf('command1:  command1.'), -1);

        // Load another one, but disable both clear and no-invoke-method
        const runner2 = _createRunner({
            'commands': _commandDir('fails-when-a-command-without-an-invoke-method-is-encountered'),
            'disabled': ['clear', 'no-invoke-method']
        });
        await runner2.start();
        const { stdout: stdout2, stderr: stderr2 } = await runner2.exec('help');
        assert.ok(!stderr2);
        assert.strictEqual(stdout2.indexOf('clear'), -1);
        assert.strictEqual(stdout2.indexOf('no-invoke-method'), -1);
        assert.notStrictEqual(stdout2.indexOf('command1:  command1.'), -1);
    });
});

describe('Built-In Commands', () => {

    describe('non-existing', () => {

        it('provides an error and lists commands when a non-existing command is entered', async () => {
            const runner = _createRunner();
            await runner.start();
            const { stdout, stderr } = await runner.exec('bleh');
            assert.ok(!stdout);
            assert.notStrictEqual(stderr.indexOf('Invalid command:'), -1);
            assert.notStrictEqual(stderr.indexOf('bleh'), -1);
        });
    });


    describe('commented', () => {

        it('ignores commands starting with a hash', async () => {
            const runner = _createRunner();
            await runner.start();
            const { stdout, stderr } = await runner.exec('  # bleh');
            assert.ok(!stdout);
            assert.ok(!stderr);
        });
    });


    describe('clear', () => {

        it('executes the clear-screen control characters when invoked', async () => {
            const runner = _createRunner();
            await runner.start();
            const { stdout, stderr } = await runner.exec('clear');
            assert.ok(!stderr);
            assert.strictEqual(stdout, '\u001B[2J\u001B[0;0f');
        });
    });

    describe('help', () => {

        it('lists the help and quit command when run without arguments', async () => {
            const runner = _createRunner();
            await runner.start();
            const { stdout, stderr } = await runner.exec('help');
            assert.ok(!stderr);
            assert.notStrictEqual(stdout.indexOf('clear:  Clear the terminal window.'), -1);
            assert.notStrictEqual(stdout.indexOf('help :  Show a dialog of all available commands.'), -1);
            assert.notStrictEqual(stdout.indexOf('quit :  Quit the interactive shell.'), -1);
        });

        it('lists the help and usage of the quit command', async () => {
            const runner = _createRunner();
            await runner.start();
            const { stdout, stderr } = await runner.exec('help quit');
            assert.ok(!stderr);
            assert.notStrictEqual(stdout.indexOf('Quit the interactive shell.'), -1);
        });

        it('lists the help and usage of the help command', async () => {
            const runner = _createRunner();
            await runner.start();
            const { stdout, stderr } = await runner.exec('help help');
            assert.ok(!stderr);
            assert.notStrictEqual(stdout.indexOf('Show a dialog of all available commands.'), -1);
            assert.notStrictEqual(stdout.indexOf('Usage: help [<command>]'), -1);
        });

        it('hides commands from the command listing when configured to do so', async () => {
            // Hide the "clear" command from the index
            const runner = _createRunner({
                env: {
                    corporal_command_settings: {
                        help: {
                            hide: ['clear']
                        }
                    }
                }
            });
            await runner.start();
            const { stdout: stdout1, stderr: stderr1 } = await runner.exec('help');
            assert.ok(!stderr1);

            // Ensure it shows help and quit
            assert.notStrictEqual(stdout1.indexOf('help:  Show a dialog of all available commands.'), -1);
            assert.notStrictEqual(stdout1.indexOf('quit:  Quit the interactive shell.'), -1);

            // Ensure it does not show clear
            assert.strictEqual(stdout1.indexOf('clear'), -1);

            // Ensure it does show the help for clear when specifically requested
            const { stdout: stdout2, stderr: stderr2 } = await runner.exec('help clear');
            assert.ok(!stderr2);
            assert.notStrictEqual(stdout2.indexOf('Clear the terminal window.'), -1);
        });
    });

    describe('quit', () => {

        it('quits the process', async () => {
            const runner = _createRunner();
            await runner.start();
            await runner.exec('quit');
            const code = await runner.onceAsync('close');
            assert.strictEqual(code, 0);
        });
    });

    describe('Error Handling', () => {

        it('handles precedence use-cases for error type and code', async () => {
            const runner = _createRunner({ commands: _commandDir('error-handler-resolution') });
            await runner.start();

            // Verify all precedence use-cases based on error type and code
            const { stdout: stdout1 } = await runner.exec('throw-typea-stringmatch');
            assert.strictEqual(stdout1, 'TypeAError: isastringmatch\n');
            const { stdout: stdout2 } = await runner.exec('throw-typea-regexpmatch');
            assert.strictEqual(stdout2, 'TypeAError: isaregexpmatch\n');
            const { stdout: stdout3 } = await runner.exec('throw-typea-functionmatch');
            assert.strictEqual(stdout3, 'TypeAError: isafunctionmatch\n');
            const { stdout: stdout4 } = await runner.exec('throw-typea-nomatch');
            assert.strictEqual(stdout4, 'TypeAError: isanullmatch 0\n');
            const { stdout: stdout5 } = await runner.exec('throw-typea-nocode');
            assert.strictEqual(stdout5, 'TypeAError: isanullmatch 0\n');
            const { stdout: stdout6 } = await runner.exec('throw-typea-stringmatch-ordermatters');
            assert.strictEqual(stdout6, 'TypeAError: teststringprecedence 0\n');
            const { stdout: stdout7 } = await runner.exec('throw-typea-regexpmatch-ordermatters');
            assert.strictEqual(stdout7, 'TypeAError: testregexpprecedence 0\n');
            const { stdout: stdout8 } = await runner.exec('throw-typea-functionmatch-ordermatters');
            assert.strictEqual(stdout8, 'TypeAError: testfunctionprecedence 0\n');
            const { stdout: stdout9 } = await runner.exec('throw-typeb-stringmatch');
            assert.strictEqual(stdout9, 'TypeBError: isastringmatch\n');
            const { stdout: stdout10 } = await runner.exec('throw-error-stringmatch');
            assert.strictEqual(stdout10, 'Error: isastringmatch\n');
            const { stdout: stdout11 } = await runner.exec('throw-catchall');
            assert.strictEqual(stdout11, 'Error: catchall\n');

            // Ensure we can still somewhat operate and exit properly
            const { stdout: stdout12 } = await runner.exec('help');
            assert.notStrictEqual(stdout12.indexOf('Clear the terminal window.'), -1);
            assert.notStrictEqual(stdout12.indexOf('Show a dialog of all available commands.'), -1);
            assert.notStrictEqual(stdout12.indexOf('Quit the interactive shell.'), -1);
            await runner.exec('quit');
            const code = await runner.onceAsync('close');
            assert.strictEqual(code, 0);
        });
    });
});

describe('Command Contexts', () => {
    it('only makes commands available that are scoped to the current context', async () => {
        const runner = _createRunner({
            commands: _commandDir('command-contexts'),
            contexts: {
                '': ['available-in-default-context'],
                '*': ['switch-context'],
                contexta: ['available-in-contexta'],
                contextb: ['available-in-contextb']
            }
        });

        await runner.start();
            // Ensure only the internal, * commands and those specified for the default context are available in the default context
        const { stdout, stderr } = await runner.exec('help');
        assert.ok(!stderr);
        assert.notStrictEqual(stdout.indexOf('available-in-default-context:'), -1);
        assert.notStrictEqual(stdout.indexOf('switch-context              :'), -1);
        assert.notStrictEqual(stdout.indexOf('clear                       :'), -1);
        assert.notStrictEqual(stdout.indexOf('help                        :'), -1);
        assert.notStrictEqual(stdout.indexOf('quit                        :'), -1);
        assert.strictEqual(stdout.indexOf('contexta'), -1);
        assert.strictEqual(stdout.indexOf('contextb'), -1);

        // Ensure we can't invoke any of the commands out of context
        const { stdout: stdout1, stderr: stderr1 } = await runner.exec('available-in-contexta');
        assert.ok(!stdout1);
        assert.notStrictEqual(stderr1.indexOf('Invalid command'), -1);

                    // Ensure we can invoke the default context command
        const { stderr: stderr2 } = await runner.exec('available-in-default-context');
        assert.ok(!stderr2);

        // Switch contexts
        await runner.exec('switch-context contexta');

        // Ensure we only get internal, * and contexta commands
        const { stdout: stdout3, stderr: stderr3 } = await runner.exec('help');
        assert.ok(!stderr3);
        assert.notStrictEqual(stdout3.indexOf('available-in-contexta:'), -1);
        assert.notStrictEqual(stdout3.indexOf('switch-context       :'), -1);
        assert.notStrictEqual(stdout3.indexOf('clear                :'), -1);
        assert.notStrictEqual(stdout3.indexOf('help                 :'), -1);
        assert.notStrictEqual(stdout3.indexOf('quit                 :'), -1);
        assert.strictEqual(stdout3.indexOf('default'), -1);
        assert.strictEqual(stdout3.indexOf('contextb'), -1);

        // Ensure we can't invoke the default context command
        const { stdout: stdout4, stderr: stderr4 } = await runner.exec('available-in-default-context');
        assert.ok(!stdout4);
        assert.notStrictEqual(stderr4.indexOf('Invalid command'), -1);

        // Ensure we can now invoke contexta
        const { stderr: stderr5 } = await runner.exec('available-in-contexta');
        assert.ok(!stderr5);
    });
});

/**
 * Creates a runner and keeps track of it to be closed after the
 * test.
 */
function _createRunner(options?: CorporalOptions) {
    const runner = new CorporalTestRunner(options);
    _currentRunners.push(runner);
    return runner;
}

/**
 * Convenience method to get a commands directory by bottom-level
 * folder name
 */
function _commandDir(dir: string): string {
    return path.join(__dirname, 'commands', dir);
}
