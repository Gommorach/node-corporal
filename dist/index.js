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
require("colors");
const events_1 = __importDefault(require("events"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const session_1 = __importDefault(require("./lib/session"));
const util_1 = __importDefault(require("./lib/util"));
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
class Corporal extends events_1.default.EventEmitter {
    constructor(corporalOptions) {
        super();
        corporalOptions = Object.assign({}, corporalOptions);
        corporalOptions.disabled = corporalOptions.disabled || [];
        corporalOptions.env = corporalOptions.env || {};
        underscore_1.default.defaults(corporalOptions.env, {
            'corporal_command_settings': {},
            'ps1': '> ' /*.bold*/,
            'ps2': '> '
        });
        this.init(corporalOptions);
    }
    get session() {
        return this._session;
    }
    init(corporalOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const internalCommandsDir = path_1.default.join(__dirname, 'commands');
                const internalCommands = yield Corporal._loadCommandsFromDir(internalCommandsDir, corporalOptions.disabled);
                // Resolve the commands provided by the consumer
                const consumerCommands = yield Corporal._resolveConsumerCommands(corporalOptions);
                // Merge the internal commands with consumer commands to get all available commands
                const allCommands = Object.assign(Object.assign({}, internalCommands), consumerCommands);
                // Seed the command context, ensuring that our internal commands always available in all contexts
                let commandContexts;
                if (!corporalOptions.commandContexts) {
                    // If there is no configuration for command contexts, then all commands are simply
                    // available at all times
                    commandContexts = { '*': { 'commands': underscore_1.default.keys(allCommands) } };
                }
                else {
                    // If there is a configuration for command contexts, all we need to do is make sure
                    // that the internal commands are always available (i.e., clear, help and quit)
                    commandContexts = corporalOptions.commandContexts;
                    commandContexts['*'] = commandContexts['*'] || {};
                    commandContexts['*'].commands = commandContexts['*'].commands || [];
                    commandContexts['*'].commands = underscore_1.default.union(commandContexts['*'].commands, underscore_1.default.keys(internalCommands));
                }
                this._session = new session_1.default({
                    commandContexts,
                    env: corporalOptions.env,
                    stdout: corporalOptions.stdout,
                    stderr: corporalOptions.stderr,
                    stdin: corporalOptions.stdin
                });
                underscore_1.default.each(allCommands, (command, name) => {
                    this._session.commands().set(name, command);
                });
                // Initialize each resolved command
                yield Corporal._initializeCommands(this._session);
                return this.emit('load');
            }
            catch (err) {
                return this.emit('error', err);
            }
        });
    }
    /**
     * Start a prompt loop for the user
     *
     * @param   {Object}    [options]               Optional loop options
     * @param   {String[]}  [options.history=[]]    The initial command history to use for toggling up
     *                                              and down through command history
     */
    loop(options = { history: [] }) {
        return __awaiter(this, void 0, void 0, function* () {
            options.history = options.history || [];
            // Apply all known error handlers to the session
            this._session.errorHandlers(this._errorHandlers);
            // Begin the command loop
            return util_1.default.doCommandLoop(underscore_1.default.extend(options, { 'session': this._session }));
        });
    }
    ;
    /**
     * Invoke a command programmatically with the current session
     *
     * @param   {String}    commandName     The name of the command to invoke
     * @param   {String[]}  [args]          The array of arguments (i.e., argv) with which to invoke the
     *                                      command
     * @param   {Function}  [callback]      Invoked when the command completes
     */
    exec(commandName, args = [], callback = underscore_1.default.noop) {
        return __awaiter(this, void 0, void 0, function* () {
            if (underscore_1.default.isFunction(args)) {
                callback = args;
            }
            // Apply all known error handlers to the session
            this._session.errorHandlers(this._errorHandlers);
            // Invoke the command with the current session
            yield util_1.default.invokeCommand(this._session, commandName, args);
            callback();
        });
    }
    ;
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
    onCommandError(type, codeMatch, handler) {
        let errorCodeMatch;
        let errorHandler;
        if (errorHandler) {
            errorCodeMatch = codeMatch;
            errorHandler = handler;
        }
        else {
            errorCodeMatch = undefined;
            errorHandler = codeMatch;
        }
        // Resolve type parameters
        if (!underscore_1.default.isFunction(type)) {
            throw new Error('Unexpected first argument type for onCommandError handler');
        }
        // Resolve the codeMatch and handler parameters
        if (!underscore_1.default.isFunction(errorHandler)) {
            throw new Error('Unexpected second argument type for onCommandError handler');
        }
        // Seed the error handlers for this type of error
        let errorHandlers = this._errorHandlers = this._errorHandlers || [];
        let handlersForType = underscore_1.default.findWhere(errorHandlers, { type });
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
        if (underscore_1.default.isFunction(errorCodeMatch)) {
            handlersForType['function'].push({ codeMatch: errorCodeMatch, handler: errorHandler });
        }
        else if (underscore_1.default.isRegExp(errorCodeMatch)) {
            handlersForType['regexp'].push({ codeMatch: errorCodeMatch, handler: errorHandler });
        }
        else if (underscore_1.default.isString(errorCodeMatch)) {
            handlersForType['string'].push({ codeMatch: errorCodeMatch, handler: errorHandler });
        }
        else if (!errorCodeMatch) {
            handlersForType['null'].push({ handler: errorHandler });
        }
        else {
            throw new Error('Invalid type for "codeMatch" while registering onCommandError handler');
        }
    }
    ;
    /**
     * Given the corporal options, load the consumer commands based on the configuration.
     */
    static _resolveConsumerCommands(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const commands = {};
            if (underscore_1.default.isString(options.commands)) {
                // Load the commands from the specified string directory path
                return yield Corporal._loadCommandsFromDir(options.commands, options.disabled);
            }
            else if (underscore_1.default.isObject(options.commands)) {
                // Load the commands from the explicit commands object. We filter out any command name that
                // is specified to be "disabled" in the corporal options
                underscore_1.default.chain(options.commands).keys().difference(options.disabled).each((commandName) => {
                    commands[commandName] = options.commands[commandName];
                });
            }
            return commands;
        });
    }
    /**
     * Load commands from JS files in a directory path.
     */
    static _loadCommandsFromDir(dirPath, disabled) {
        return __awaiter(this, void 0, void 0, function* () {
            const commands = {};
            const fileNames = yield fs_extra_1.default.readdir(dirPath);
            // Load each JS file as a command into the session
            underscore_1.default.chain(fileNames)
                // Only accept JS files
                .filter((fileName) => fileName.split('.').pop() === 'js')
                // Pluck out the extension of the file name to get the command name
                .map((fileName) => fileName.split('.').slice(0, -1).join('.'))
                // Don't accept any from the disabled list of command names
                .difference(disabled)
                // Add each command to the session
                .each((commandName) => {
                commands[commandName] = require(path_1.default.join(dirPath, commandName));
                if (commands[commandName].default) {
                    commands[commandName] = commands[commandName].default;
                }
            });
            return commands;
        });
    }
    /**
     * Initialize each command in the given list of commands
     */
    static _initializeCommands(session, _commands = underscore_1.default.values(session.commands().all())) {
        return __awaiter(this, void 0, void 0, function* () {
            if (underscore_1.default.isEmpty(_commands)) {
                return;
            }
            // Get the next command to initialize
            const command = _commands.pop();
            if (!underscore_1.default.isFunction(command.init) && !underscore_1.default.isFunction(command.initAsync)) {
                // If it does not have the optional init function we just skip it
                yield Corporal._initializeCommands(session, _commands);
                return;
            }
            // Initialize the command
            if (underscore_1.default.isFunction(command.init)) {
                // Use callback paradigm
                yield command.init(session, () => __awaiter(this, void 0, void 0, function* () {
                    // Recursively move on to the next command
                    return yield Corporal._initializeCommands(session, _commands);
                }));
            }
            else {
                // Use promise paradigm
                yield command.initAsync(session);
                // Recursively move on to the next command
                return yield Corporal._initializeCommands(session, _commands);
            }
        });
    }
}
exports.default = Corporal;
//# sourceMappingURL=index.js.map