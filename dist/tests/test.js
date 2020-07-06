"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const underscore_1 = __importDefault(require("underscore"));
const assert_1 = __importDefault(require("assert"));
const path_1 = __importDefault(require("path"));
require("mocha");
const runner_1 = __importDefault(require("./util/runner"));
let _currentRunners = [];
/**
 * Kill all runners that were created in the previous test
 */
afterEach((callback) => {
    underscore_1.default.each(_currentRunners, (runner) => {
        runner.close();
    });
    _currentRunners = [];
    return callback();
});
describe('Command Loading', () => {
    it('loads commands from a directory', () => __awaiter(void 0, void 0, void 0, function* () {
        const runner = _createRunner({ commands: _commandDir('loads-commands-from-a-directory') });
        yield runner.start();
        const { stdout, stderr } = yield runner.exec('help');
        assert_1.default.ok(!stderr);
        assert_1.default.notStrictEqual(stdout.indexOf('help    :  Show a dialog of all available commands.'), -1);
        assert_1.default.notStrictEqual(stdout.indexOf('quit    :  Quit the interactive shell.'), -1);
        assert_1.default.notStrictEqual(stdout.indexOf('command1:  command1.'), -1);
        assert_1.default.notStrictEqual(stdout.indexOf('command2:  command2.'), -1);
    }));
    it('fails when a command without a description is encountered', () => __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve) => __awaiter(void 0, void 0, void 0, function* () {
            const runner = _createRunner({ commands: _commandDir('fails-when-a-command-without-a-description-is-encountered') });
            yield runner.start();
            // Keep track of all stderr output from the process. We are listening for an error
            let stderr = '';
            runner.on('stderr', (data) => {
                stderr += data;
            });
            runner.on('close', (code) => {
                assert_1.default.strictEqual(code, 8);
                assert_1.default.notStrictEqual(stderr.indexOf('Command "no-description" must have a description string'), -1);
                resolve();
            });
        }));
    }));
    it('fails when a command without an invoke method is encountered', () => {
        return new Promise((resolve) => __awaiter(void 0, void 0, void 0, function* () {
            const runner = _createRunner({ commands: _commandDir('fails-when-a-command-without-an-invoke-method-is-encountered') });
            yield runner.start();
            // Keep track of all stderr output from the process. We are listening for an error
            let stderr = '';
            runner.on('stderr', (data) => {
                stderr += data;
            });
            runner.on('close', (code) => {
                assert_1.default.strictEqual(code, 8);
                assert_1.default.notStrictEqual(stderr.indexOf('Command "no-invoke-method" must have an invoke function'), -1);
                resolve();
            });
        }));
    });
    it('does not load commands that are disabled', () => __awaiter(void 0, void 0, void 0, function* () {
        // Load from a directory with a failing command while disabling the failing command
        const runner1 = _createRunner({
            'commands': _commandDir('fails-when-a-command-without-an-invoke-method-is-encountered'),
            'disabled': ['no-invoke-method']
        });
        yield runner1.start;
        const { stdout: stdout1, stderr: stderr1 } = yield runner1.exec('help');
        assert_1.default.ok(!stderr1);
        assert_1.default.strictEqual(stdout1.indexOf('no-invoke-method'), -1);
        assert_1.default.notStrictEqual(stdout1.indexOf('command1:  command1.'), -1);
        // Load another one, but disable both clear and no-invoke-method
        const runner2 = _createRunner({
            'commands': _commandDir('fails-when-a-command-without-an-invoke-method-is-encountered'),
            'disabled': ['clear', 'no-invoke-method']
        });
        yield runner2.start();
        const { stdout: stdout2, stderr: stderr2 } = yield runner2.exec('help');
        assert_1.default.ok(!stderr2);
        assert_1.default.strictEqual(stdout2.indexOf('clear'), -1);
        assert_1.default.strictEqual(stdout2.indexOf('no-invoke-method'), -1);
        assert_1.default.notStrictEqual(stdout2.indexOf('command1:  command1.'), -1);
    }));
});
describe('Built-In Commands', () => {
    describe('non-existing', () => {
        it('provides an error and lists commands when a non-existing command is entered', () => __awaiter(void 0, void 0, void 0, function* () {
            const runner = _createRunner();
            yield runner.start();
            const { stdout, stderr } = yield runner.exec('bleh');
            assert_1.default.ok(!stdout);
            assert_1.default.notStrictEqual(stderr.indexOf('Invalid command:'), -1);
            assert_1.default.notStrictEqual(stderr.indexOf('bleh'), -1);
        }));
    });
    describe('commented', () => {
        it('ignores commands starting with a hash', () => __awaiter(void 0, void 0, void 0, function* () {
            const runner = _createRunner();
            yield runner.start();
            const { stdout, stderr } = yield runner.exec('  # bleh');
            assert_1.default.ok(!stdout);
            assert_1.default.ok(!stderr);
        }));
    });
    describe('clear', () => {
        it('executes the clear-screen control characters when invoked', () => __awaiter(void 0, void 0, void 0, function* () {
            const runner = _createRunner();
            yield runner.start();
            const { stdout, stderr } = yield runner.exec('clear');
            assert_1.default.ok(!stderr);
            assert_1.default.strictEqual(stdout, '\u001B[2J\u001B[0;0f');
        }));
    });
    describe('help', () => {
        it('lists the help and quit command when run without arguments', () => __awaiter(void 0, void 0, void 0, function* () {
            const runner = _createRunner();
            yield runner.start();
            const { stdout, stderr } = yield runner.exec('help');
            assert_1.default.ok(!stderr);
            assert_1.default.notStrictEqual(stdout.indexOf('clear:  Clear the terminal window.'), -1);
            assert_1.default.notStrictEqual(stdout.indexOf('help :  Show a dialog of all available commands.'), -1);
            assert_1.default.notStrictEqual(stdout.indexOf('quit :  Quit the interactive shell.'), -1);
        }));
        it('lists the help and usage of the quit command', () => __awaiter(void 0, void 0, void 0, function* () {
            const runner = _createRunner();
            yield runner.start();
            const { stdout, stderr } = yield runner.exec('help quit');
            assert_1.default.ok(!stderr);
            assert_1.default.notStrictEqual(stdout.indexOf('Quit the interactive shell.'), -1);
        }));
        it('lists the help and usage of the help command', () => __awaiter(void 0, void 0, void 0, function* () {
            const runner = _createRunner();
            yield runner.start();
            const { stdout, stderr } = yield runner.exec('help help');
            assert_1.default.ok(!stderr);
            assert_1.default.notStrictEqual(stdout.indexOf('Show a dialog of all available commands.'), -1);
            assert_1.default.notStrictEqual(stdout.indexOf('Usage: help [<command>]'), -1);
        }));
        it('hides commands from the command listing when configured to do so', () => __awaiter(void 0, void 0, void 0, function* () {
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
            yield runner.start();
            const { stdout: stdout1, stderr: stderr1 } = yield runner.exec('help');
            assert_1.default.ok(!stderr1);
            // Ensure it shows help and quit
            assert_1.default.notStrictEqual(stdout1.indexOf('help:  Show a dialog of all available commands.'), -1);
            assert_1.default.notStrictEqual(stdout1.indexOf('quit:  Quit the interactive shell.'), -1);
            // Ensure it does not show clear
            assert_1.default.strictEqual(stdout1.indexOf('clear'), -1);
            // Ensure it does show the help for clear when specifically requested
            const { stdout: stdout2, stderr: stderr2 } = yield runner.exec('help clear');
            assert_1.default.ok(!stderr2);
            assert_1.default.notStrictEqual(stdout2.indexOf('Clear the terminal window.'), -1);
        }));
    });
    describe('quit', () => {
        it('quits the process', () => __awaiter(void 0, void 0, void 0, function* () {
            const runner = _createRunner();
            yield runner.start();
            yield runner.exec('quit');
            const code = yield runner.onceAsync('close');
            assert_1.default.strictEqual(code, 0);
        }));
    });
    describe('Error Handling', () => {
        it('handles precedence use-cases for error type and code', () => __awaiter(void 0, void 0, void 0, function* () {
            const runner = _createRunner({ commands: _commandDir('error-handler-resolution') });
            yield runner.start();
            // Verify all precedence use-cases based on error type and code
            const { stdout: stdout1 } = yield runner.exec('throw-typea-stringmatch');
            assert_1.default.strictEqual(stdout1, 'TypeAError: isastringmatch\n');
            const { stdout: stdout2 } = yield runner.exec('throw-typea-regexpmatch');
            assert_1.default.strictEqual(stdout2, 'TypeAError: isaregexpmatch\n');
            const { stdout: stdout3 } = yield runner.exec('throw-typea-functionmatch');
            assert_1.default.strictEqual(stdout3, 'TypeAError: isafunctionmatch\n');
            const { stdout: stdout4 } = yield runner.exec('throw-typea-nomatch');
            assert_1.default.strictEqual(stdout4, 'TypeAError: isanullmatch 0\n');
            const { stdout: stdout5 } = yield runner.exec('throw-typea-nocode');
            assert_1.default.strictEqual(stdout5, 'TypeAError: isanullmatch 0\n');
            const { stdout: stdout6 } = yield runner.exec('throw-typea-stringmatch-ordermatters');
            assert_1.default.strictEqual(stdout6, 'TypeAError: teststringprecedence 0\n');
            const { stdout: stdout7 } = yield runner.exec('throw-typea-regexpmatch-ordermatters');
            assert_1.default.strictEqual(stdout7, 'TypeAError: testregexpprecedence 0\n');
            const { stdout: stdout8 } = yield runner.exec('throw-typea-functionmatch-ordermatters');
            assert_1.default.strictEqual(stdout8, 'TypeAError: testfunctionprecedence 0\n');
            const { stdout: stdout9 } = yield runner.exec('throw-typeb-stringmatch');
            assert_1.default.strictEqual(stdout9, 'TypeBError: isastringmatch\n');
            const { stdout: stdout10 } = yield runner.exec('throw-error-stringmatch');
            assert_1.default.strictEqual(stdout10, 'Error: isastringmatch\n');
            const { stdout: stdout11 } = yield runner.exec('throw-catchall');
            assert_1.default.strictEqual(stdout11, 'Error: catchall\n');
            // Ensure we can still somewhat operate and exit properly
            const { stdout: stdout12 } = yield runner.exec('help');
            assert_1.default.notStrictEqual(stdout12.indexOf('Clear the terminal window.'), -1);
            assert_1.default.notStrictEqual(stdout12.indexOf('Show a dialog of all available commands.'), -1);
            assert_1.default.notStrictEqual(stdout12.indexOf('Quit the interactive shell.'), -1);
            yield runner.exec('quit');
            const code = yield runner.onceAsync('close');
            assert_1.default.strictEqual(code, 0);
        }));
    });
});
describe('Command Contexts', () => {
    it('only makes commands available that are scoped to the current context', () => __awaiter(void 0, void 0, void 0, function* () {
        const runner = _createRunner({
            commands: _commandDir('command-contexts'),
            contexts: {
                '': ['available-in-default-context'],
                '*': ['switch-context'],
                contexta: ['available-in-contexta'],
                contextb: ['available-in-contextb']
            }
        });
        yield runner.start();
        // Ensure only the internal, * commands and those specified for the default context are available in the default context
        const { stdout, stderr } = yield runner.exec('help');
        assert_1.default.ok(!stderr);
        assert_1.default.notStrictEqual(stdout.indexOf('available-in-default-context:'), -1);
        assert_1.default.notStrictEqual(stdout.indexOf('switch-context              :'), -1);
        assert_1.default.notStrictEqual(stdout.indexOf('clear                       :'), -1);
        assert_1.default.notStrictEqual(stdout.indexOf('help                        :'), -1);
        assert_1.default.notStrictEqual(stdout.indexOf('quit                        :'), -1);
        assert_1.default.strictEqual(stdout.indexOf('contexta'), -1);
        assert_1.default.strictEqual(stdout.indexOf('contextb'), -1);
        // Ensure we can't invoke any of the commands out of context
        const { stdout: stdout1, stderr: stderr1 } = yield runner.exec('available-in-contexta');
        assert_1.default.ok(!stdout1);
        assert_1.default.notStrictEqual(stderr1.indexOf('Invalid command'), -1);
        // Ensure we can invoke the default context command
        const { stderr: stderr2 } = yield runner.exec('available-in-default-context');
        assert_1.default.ok(!stderr2);
        // Switch contexts
        yield runner.exec('switch-context contexta');
        // Ensure we only get internal, * and contexta commands
        const { stdout: stdout3, stderr: stderr3 } = yield runner.exec('help');
        assert_1.default.ok(!stderr3);
        assert_1.default.notStrictEqual(stdout3.indexOf('available-in-contexta:'), -1);
        assert_1.default.notStrictEqual(stdout3.indexOf('switch-context       :'), -1);
        assert_1.default.notStrictEqual(stdout3.indexOf('clear                :'), -1);
        assert_1.default.notStrictEqual(stdout3.indexOf('help                 :'), -1);
        assert_1.default.notStrictEqual(stdout3.indexOf('quit                 :'), -1);
        assert_1.default.strictEqual(stdout3.indexOf('default'), -1);
        assert_1.default.strictEqual(stdout3.indexOf('contextb'), -1);
        // Ensure we can't invoke the default context command
        const { stdout: stdout4, stderr: stderr4 } = yield runner.exec('available-in-default-context');
        assert_1.default.ok(!stdout4);
        assert_1.default.notStrictEqual(stderr4.indexOf('Invalid command'), -1);
        // Ensure we can now invoke contexta
        const { stderr: stderr5 } = yield runner.exec('available-in-contexta');
        assert_1.default.ok(!stderr5);
    }));
});
/**
 * Creates a runner and keeps track of it to be closed after the
 * test.
 */
function _createRunner(options) {
    const runner = new runner_1.default(options);
    _currentRunners.push(runner);
    return runner;
}
/**
 * Convenience method to get a commands directory by bottom-level
 * folder name
 */
function _commandDir(dir) {
    return path_1.default.join(__dirname, 'commands', dir);
}
//# sourceMappingURL=test.js.map