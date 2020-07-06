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
const child_process_1 = __importDefault(require("child_process"));
const events_1 = __importDefault(require("events"));
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
/**
 * Create a runner that can be used to start a process running the
 * corporal interactive shell utility
 */
class Runner extends events_1.default.EventEmitter {
    constructor(options = { commands: [] }) {
        super();
        this._options = options;
        this._options.env = underscore_1.default.defaults({}, this._options.env, {
            'ps1': '> ',
            'ps2': '> '
        });
    }
    /**
     * Begin the corporal process and invoke the callback when the first prompt is given for input
     */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            // The args for the corporal process fork
            const args = [path_1.default.join(__dirname, 'internal', 'runner.js')];
            // Apply the session environment
            args.push('--env', JSON.stringify(this._options.env));
            if (this._options.commands) {
                args.push('--commands', this._options.commands);
            }
            if (this._options.disabled) {
                args.push('--disabled', this._options.disabled.join(','));
            }
            if (this._options.contexts) {
                underscore_1.default.each(this._options.contexts, (commandNames, contextName) => {
                    args.push(util_1.default.format('--contexts.%s', contextName), commandNames.join(','));
                });
            }
            if (process.env['CORPORAL_TEST_VERBOSE']) {
                console.log('spawn: %s', JSON.stringify(underscore_1.default.union('node', args), null, 2));
            }
            // Spawn the corporal process
            this._child = child_process_1.default.spawn('node', args);
            // Pass stdout, stderr and close events to the runner so consumers can listen
            this._child.stdout.on('data', (data) => {
                if (process.env['CORPORAL_TEST_VERBOSE']) {
                    console.log('runner stdout: %s', data);
                }
                this.emit('stdout', data);
            });
            this._child.stderr.on('data', (data) => {
                if (process.env['CORPORAL_TEST_VERBOSE']) {
                    console.log('runner stderr: %s', data);
                }
                this.emit('stderr', data);
            });
            this._child.on('close', (code, signal) => {
                this.emit('close', code, signal);
            });
            // When the next prompt occurs, return to the caller
            yield this._whenPrompt();
        });
    }
    ;
    /**
     * Invoke a command and wait for the next prompt to be given
     */
    exec(str) {
        return __awaiter(this, void 0, void 0, function* () {
            if (process.env['CORPORAL_TEST_VERBOSE']) {
                console.log('runner stdin: %s', str);
            }
            this._child.stdin.write(str + '\n');
            return yield this._whenPrompt();
        });
    }
    ;
    /**
     * Wait for the next prompt to be given by the process, then resolve the Promise
     */
    _whenPrompt() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                let _stderr = '';
                let _stdout = '';
                const _onStderr = (data) => {
                    _stderr += data;
                };
                const _onStdout = (data) => {
                    const splitData = data.toString().split(this._options.env.ps1);
                    _stdout += splitData[0];
                    if (splitData.length === 1) {
                        this._child.stdout.once('data', _onStdout);
                        return;
                    }
                    // We got the next prompt, so command is complete and we return to the caller
                    this._child.stderr.removeListener('data', _onStderr);
                    resolve({ stdout: _stdout, stderr: _stderr });
                };
                // Apply the listeners to listen for command execution
                this._child.stderr.on('data', _onStderr);
                this._child.stdout.once('data', _onStdout);
            });
        });
    }
    ;
    onceAsync(event) {
        return new Promise((resolve) => {
            this.once(event, resolve);
        });
    }
    /**
     * Close the runner and associated process
     */
    close() {
        this._child.kill();
    }
    ;
}
exports.default = Runner;
//# sourceMappingURL=runner.js.map