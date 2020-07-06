import _ from 'underscore';
import child from 'child_process';
import events from 'events';
import path from 'path';
import util from 'util';
import { CorporalOptions } from '../../index';
import assert from 'assert';
import { Observable } from 'rxjs';

/**
 * Create a runner that can be used to start a process running the
 * corporal interactive shell utility
 */
export default class Runner extends events.EventEmitter {
    private _options: any;
    private _child: any;

    constructor(options: CorporalOptions = { commands: [] }) {
        super();

        this._options = options;
        this._options.env = _.defaults({}, this._options.env, {
            'ps1': '> ',
            'ps2': '> '
        });
    }

    /**
     * Begin the corporal process and invoke the callback when the first prompt is given for input
     */
    public async start(): Promise<void> {
        // The args for the corporal process fork
        const args = [path.join(__dirname, 'internal', 'runner.js')];

        // Apply the session environment
        args.push('--env', JSON.stringify(this._options.env));

        if (this._options.commands) {
            args.push('--commands', this._options.commands);
        }

        if (this._options.disabled) {
            args.push('--disabled', this._options.disabled.join(','));
        }

        if (this._options.contexts) {
            _.each(this._options.contexts, (commandNames: string[], contextName: string) => {
                args.push(util.format('--contexts.%s', contextName), commandNames.join(','));
            });
        }

        if (process.env['CORPORAL_TEST_VERBOSE']) {
            console.log('spawn: %s', JSON.stringify(_.union('node', args), null, 2));
        }

        // Spawn the corporal process
        this._child = child.spawn('node', args);

        // Pass stdout, stderr and close events to the runner so consumers can listen
        this._child.stdout.on('data', (data: string) => {
            if (process.env['CORPORAL_TEST_VERBOSE']) {
                console.log('runner stdout: %s', data);
            }
            this.emit('stdout', data);
        });
        this._child.stderr.on('data', (data: string) => {
            if (process.env['CORPORAL_TEST_VERBOSE']) {
                console.log('runner stderr: %s', data);
            }
            this.emit('stderr', data);
        });
        this._child.on('close', (code: string, signal: string) => {
            this.emit('close', code, signal);
        });

        // When the next prompt occurs, return to the caller
        await this._whenPrompt();
    };

    /**
     * Invoke a command and wait for the next prompt to be given
     */
    public async exec(str: string): Promise<{stdout: string, stderr: string}> {
        if (process.env['CORPORAL_TEST_VERBOSE']) {
            console.log('runner stdin: %s', str)
        }

        this._child.stdin.write(str + '\n');
        return await this._whenPrompt();
    };

    /**
     * Wait for the next prompt to be given by the process, then resolve the Promise
     */
    public async _whenPrompt(): Promise<{stdout: string, stderr: string}> {
        return new Promise<{stdout: string, stderr: string}>((resolve) => {
            let _stderr = '';
            let _stdout = '';

            const _onStderr = (data: Buffer) => {
                _stderr += data;
            };

            const _onStdout = (data: Buffer) => {
                const splitData = data.toString().split(this._options.env.ps1);
                _stdout += splitData[0];
                if (splitData.length === 1) {
                    this._child.stdout.once('data', _onStdout);
                    return;
                }

                // We got the next prompt, so command is complete and we return to the caller
                this._child.stderr.removeListener('data', _onStderr);
                resolve({stdout: _stdout, stderr: _stderr});
            };

            // Apply the listeners to listen for command execution
            this._child.stderr.on('data', _onStderr);
            this._child.stdout.once('data', _onStdout);
        });
    };

    public onceAsync(event: string): Promise<number> {
        return new Promise<number>((resolve) => {
            this.once(event, resolve);
        });
    }

    /**
     * Close the runner and associated process
     */
    public close() {
        this._child.kill();
    };
}
