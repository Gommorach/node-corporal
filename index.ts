import _ from 'underscore';
import 'colors';
import events from 'events';
import fs from 'fs-extra';
import path from 'path';

import CorporalSession from './lib/session';
import CorporalUtil from './lib/util';
import { CallbackCommand, Command, Commands, CommandsCallback, PromiseCommand } from './types/command';
import { ErrorHandler, Handler } from './types/handler';
import { Codematch } from "./types/codematch";
import { Stream } from "stream";
import { ReadStream, WriteStream } from "tty";

export interface CorporalOptions {
    commands?: string | any;
    disabled?: string[];
    env?: any;
    commandContexts?: any;
    streams?: any;
    contexts?: { [name: string]: string[] };
    stdin?: ReadStream;
    stdout?: WriteStream;
    stderr?: WriteStream;
}

interface CorporalLoopOptions {
    history?: any[];
}

/**
 * Create a corporal object that can be used to start a prompt loop or invoke adhoc commands.
 *
 * @param   {Object}            corporalOptions                     The corporal options
 * @param   {String|Object}     corporalOptions.commands            A string pointing to a directory from
 *                                                          which to load commands, or an object
 *                                                          keyed by command name whose value are
 *                                                          command implementation objects
 * @param   {String[]}          [corporalOptions.disabled]          A list of command names to disable
 *                                                          for the session
 * @param   {Object}            [corporalOptions.env]               The initial environment to use for the
 *                                                          session
 * @param   {Object}            [corporalOptions.commandContexts]   The command contexts to be made
 *                                                          available throughout the session. The
 *                                                          initial context name/key is the empty
 *                                                          string
 * @param   {Object}            [corporalOptions.streams]           An object holding the different streams
 *                                                          to use for input and output
 * @param   {Stream}            [corporalOptions.streams.stdout]    The standard output stream
 * @param   {Stream}            [corporalOptions.streams.stderr]    The standard error stream
 * @param   {Stream}            [corporalOptions.streams.stdin]     The standard input strecam
 */

export default class Corporal extends events.EventEmitter {
    private _errorHandlers: ErrorHandler[];
    private _session: CorporalSession;

    constructor(corporalOptions: CorporalOptions) {
        super();

        corporalOptions = { ...corporalOptions };
        corporalOptions.disabled = corporalOptions.disabled || [];
        corporalOptions.env = corporalOptions.env || {};

        _.defaults(corporalOptions.env, {
            'corporal_command_settings': {},
            'ps1': '> '/*.bold*/,
            'ps2': '> '
        });

        this.init(corporalOptions);
    }

    get session(): CorporalSession {
        return this._session;
    }

    private async init(corporalOptions: CorporalOptions) {
        try {
            const internalCommandsDir = path.join(__dirname, 'commands');
            const internalCommands = await Corporal._loadCommandsFromDir(internalCommandsDir, corporalOptions.disabled);
            // Resolve the commands provided by the consumer
            const consumerCommands = await Corporal._resolveConsumerCommands(corporalOptions);

            // Merge the internal commands with consumer commands to get all available commands
            const allCommands: Commands = { ...internalCommands, ...consumerCommands };

            // Seed the command context, ensuring that our internal commands always available in all contexts
            let commandContexts;
            if (!corporalOptions.commandContexts) {
                // If there is no configuration for command contexts, then all commands are simply
                // available at all times
                commandContexts = { '*': { 'commands': _.keys(allCommands) } };
            } else {
                // If there is a configuration for command contexts, all we need to do is make sure
                // that the internal commands are always available (i.e., clear, help and quit)
                commandContexts = corporalOptions.commandContexts;
                commandContexts['*'] = commandContexts['*'] || {};
                commandContexts['*'].commands = commandContexts['*'].commands || [];
                commandContexts['*'].commands = _.union(commandContexts['*'].commands, _.keys(internalCommands));
            }

            this._session = new CorporalSession({
                commandContexts,
                env: corporalOptions.env,
                stdout: corporalOptions.stdout,
                stderr: corporalOptions.stderr,
                stdin: corporalOptions.stdin
            });

            _.each(allCommands, (command, name) => {
                this._session.commands().set(name, command);
            });

            // Initialize each resolved command
            await Corporal._initializeCommands(this._session);
            return this.emit('load');

        } catch (err) {
            return this.emit('error', err);
        }
    }

    /**
     * Start a prompt loop for the user
     *
     * @param   {Object}    [options]               Optional loop options
     * @param   {String[]}  [options.history=[]]    The initial command history to use for toggling up
     *                                              and down through command history
     */
    public async loop(
        options: CorporalLoopOptions = { history: [] }
    ) {
        options.history = options.history || [];

        // Apply all known error handlers to the session
        this._session.errorHandlers(this._errorHandlers);

        // Begin the command loop
        return CorporalUtil.doCommandLoop(_.extend(options, { 'session': this._session }));
    };

    /**
     * Invoke a command programmatically with the current session
     *
     * @param   {String}    commandName     The name of the command to invoke
     * @param   {String[]}  [args]          The array of arguments (i.e., argv) with which to invoke the
     *                                      command
     * @param   {Function}  [callback]      Invoked when the command completes
     */
    public async exec(commandName: string, args: string[] = [], callback: Function = _.noop): Promise<void> {
        if (_.isFunction(args)) {
            callback = args;
        }

        // Apply all known error handlers to the session
        this._session.errorHandlers(this._errorHandlers);

        // Invoke the command with the current session
        await CorporalUtil.invokeCommand(this._session, commandName, args);
        callback();
    };

    /**
     * Handle an error that was thrown from a command.
     *
     * @param   {Function}              type              The type function of the error to handle
     * @param   {Codematch}             [codeMatch]       A matcher for a 'code' property that may be
     *                                                    present on the object. The type of matcher
     *                                                    drives selection priority in this order:
     *
     *                                                    1. String
     *                                                    2. RegExp
     *                                                    3. Function (takes a code as parameter)
     *                                                    4. No matcher present
     *
     *                                                    Secondary priority is based on registration order
     * @param   {Function}              handler           The handler function for the error
     * @param   {Error}                 handler.err       The error object that was caught
     * @param   {CorporalSession}       handler.session   The current corporal session
     * @param   {Function}              handler.next      The function to invoke when the next command can
     *                                                    be read from the user
     */
    public onCommandError(type: Function, codeMatch: Codematch | Handler, handler?: Handler) {
        let errorCodeMatch: Codematch | undefined;
        let errorHandler: Handler;
        if (errorHandler) {
            errorCodeMatch = codeMatch;
            errorHandler = handler;
        } else {
            errorCodeMatch = undefined;
            errorHandler = codeMatch as Handler;
        }

        // Resolve type parameters
        if (!_.isFunction(type)) {
            throw new Error('Unexpected first argument type for onCommandError handler');
        }

        // Resolve the codeMatch and handler parameters
        if (!_.isFunction(errorHandler)) {
            throw new Error('Unexpected second argument type for onCommandError handler');
        }

        // Seed the error handlers for this type of error
        let errorHandlers: ErrorHandler[] = this._errorHandlers = this._errorHandlers || [];

        let handlersForType: ErrorHandler = _.findWhere(errorHandlers, { type });
        if (!handlersForType) {
            handlersForType = {
                type,
                function: [],
                null: [],
                regexp: [],
                string: []
            };
            errorHandlers.push(handlersForType);
        }

        if (_.isFunction(errorCodeMatch)) {
            handlersForType['function'].push({ codeMatch: errorCodeMatch, handler: errorHandler });
        } else if (_.isRegExp(errorCodeMatch)) {
            handlersForType['regexp'].push({ codeMatch: errorCodeMatch, handler: errorHandler });
        } else if (_.isString(errorCodeMatch)) {
            handlersForType['string'].push({ codeMatch: errorCodeMatch, handler: errorHandler });
        } else if (!errorCodeMatch) {
            handlersForType['null'].push({ handler: errorHandler });
        } else {
            throw new Error('Invalid type for "codeMatch" while registering onCommandError handler');
        }
    };


    /**
     * Given the corporal options, load the consumer commands based on the configuration.
     */
    private static async _resolveConsumerCommands(options: CorporalOptions): Promise<Commands> {
        const commands: Commands = {};
        if (_.isString(options.commands)) {
            // Load the commands from the specified string directory path
            return await Corporal._loadCommandsFromDir(options.commands, options.disabled);
        } else if (_.isObject(options.commands)) {
            // Load the commands from the explicit commands object. We filter out any command name that
            // is specified to be "disabled" in the corporal options
            _.chain(options.commands).keys().difference(options.disabled).each((commandName) => {
                commands[commandName] = options.commands[commandName];
            });
        }

        return commands;
    }

    /**
     * Load commands from JS files in a directory path.
     */
    private static async _loadCommandsFromDir(dirPath: string, disabled: string[]): Promise<Commands> {
        const commands: Commands = {};
        const fileNames: string[] = await fs.readdir(dirPath);

        // Load each JS file as a command into the session
        _.chain(fileNames)

            // Only accept JS files
            .filter((fileName: string) => fileName.split('.').pop() === 'js')

            // Pluck out the extension of the file name to get the command name
            .map((fileName: string): string => fileName.split('.').slice(0, -1).join('.'))

            // Don't accept any from the disabled list of command names
            .difference(disabled)

            // Add each command to the session
            .each((commandName) => {
                commands[commandName] = require(path.join(dirPath, commandName)) as Command;
                if((commands[commandName] as any).default) {
                    commands[commandName] = (commands[commandName] as any).default
                }
            });

        return commands;
    }

    /**
     * Initialize each command in the given list of commands
     */
    private static async _initializeCommands(
        session: CorporalSession,
        _commands: Command[] = _.values(session.commands().all())
    ): Promise<any> {
        if (_.isEmpty(_commands)) {
            return;
        }

        // Get the next command to initialize
        const command = _commands.pop();
        if (!_.isFunction((command as CallbackCommand).init) && !_.isFunction((command as PromiseCommand).initAsync)) {
            // If it does not have the optional init function we just skip it
            await Corporal._initializeCommands(session, _commands);
            return;
        }

        // Initialize the command
        if (_.isFunction((command as CallbackCommand).init)) {
            // Use callback paradigm
            await (command as CallbackCommand).init(session, async () => {
                // Recursively move on to the next command
                return await Corporal._initializeCommands(session, _commands);
            });
        } else {
            // Use promise paradigm
            await (command as PromiseCommand).initAsync(session);
            // Recursively move on to the next command
            return await Corporal._initializeCommands(session, _commands);
        }

    }
}
