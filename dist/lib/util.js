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
const domain_1 = __importDefault(require("domain"));
const readcommand_1 = __importDefault(require("readcommand"));
const sprintf_js_1 = require("sprintf-js");
class CorporalUtil {
    /**
     * Continuously prompt the user for commands while invoking each command they provide.
     * The Promise is resolved when the user has exited.
     */
    static doCommandLoop(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = options.session;
            const history = options.history || [];
            readcommand_1.default.loop({
                input: session.stdin(),
                output: session.stdout(),
                ps1: CorporalUtil.createPs(session, 'ps1'),
                ps2: CorporalUtil.createPs(session, 'ps2'),
                autocomplete: yield CorporalUtil._createAutocomplete(session),
                history: history
            }, (err, args, str, next) => __awaiter(this, void 0, void 0, function* () {
                if (err && err.code !== 'SIGINT') {
                    // An unexpected error occurred
                    throw err;
                }
                else if (err) {
                    // User hit CTRL+C, just clear the prompt and jump to the next command
                    next();
                    return;
                }
                args = underscore_1.default.compact(args);
                if (underscore_1.default.isEmpty(args)) {
                    next();
                    return;
                }
                // Invoke the executed command
                const commandName = args.shift();
                yield CorporalUtil.invokeCommand(session, commandName, args);
                if (session.quit) {
                    // If the command quit the session, do not prompt for another command
                    return;
                }
                // Otherwise, we continue prompting
                next();
            }));
        });
    }
    ;
    /**
     * Programmatically invoke a command using the command name and parsed arguments. Note this function
     * ignores the state of `session.quit()` as quitting the session only impacts the user command loop
     */
    static invokeCommand(session, commandName, args) {
        return __awaiter(this, void 0, void 0, function* () {
            if (commandName.match(/^\s*#/)) {
                // Commands that begin with a hash are commented out, ignore them
                return;
            }
            const command = session.commands().get(commandName);
            if (!command) {
                // If the command did not exist, show the command list
                // on stderr and prepare for the next command
                session.stderr().write('Invalid command: '.red + commandName.white + '\n');
                session.stderr().write('\n\n');
                yield CorporalUtil.invokeCommand(session, 'help', ['--stderr']);
                return;
            }
            // Wrap the invocation into a domain to catch any errors that are thrown from the command
            const commandDomain = domain_1.default.create();
            commandDomain.once('error', (err) => __awaiter(this, void 0, void 0, function* () {
                // Hand any errors over to the error handler
                yield CorporalUtil._handleError(err, session);
                return;
            }));
            // Make the domain active, then inactive immediately after the command has returned
            commandDomain.enter();
            command.invoke(session, args, (err) => __awaiter(this, void 0, void 0, function* () {
                commandDomain.exit();
                // Hand any errors over to the error handler
                if (err) {
                    yield CorporalUtil._handleError(err, session);
                    return;
                }
                return;
            }));
        });
    }
    ;
    static _handleError(err, session) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get the first applicable handler
            const handlersForType = underscore_1.default.chain(session.errorHandlers())
                .filter(handlersForType => (err instanceof handlersForType.type))
                .first()
                .value();
            if (!handlersForType) {
                throw err;
            }
            // Resolve the handler for this error based on code match in priority order
            const handler = CorporalUtil._matchString(err, handlersForType['string']) ||
                CorporalUtil._matchRegExp(err, handlersForType['regexp']) ||
                CorporalUtil._matchFunction(err, handlersForType['function']) ||
                CorporalUtil._matchNull(err, handlersForType['null']);
            // If we could not find a handler that matches this we promote the error
            if (!handler) {
                throw err;
            }
            // Invoke the handler we found
            yield handler(err, session);
        });
    }
    ;
    /**
     * Create an autocompleter function that autocompletes based on the commands in the session
     */
    static _createAutocomplete(session) {
        return (args, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                args = args.slice();
                const allCommandNames = underscore_1.default.keys(session.commands().get());
                // First handle the case where this is an auto-suggest based on finding the command name
                if (underscore_1.default.isEmpty(args)) {
                    if (callback)
                        callback(allCommandNames);
                    return allCommandNames;
                }
                else if (args.length === 1) {
                    const matchingCommands = underscore_1.default.filter(allCommandNames, (commandName) => {
                        return (commandName.indexOf(args[0]) === 0);
                    });
                    if (callback) {
                        callback(null, matchingCommands);
                    }
                    return matchingCommands;
                }
                // We presumably have a command argument already, feed the remaining arguments into the
                // commands autocomplete implementation
                const commandName = args.shift();
                const command = session.commands().get(commandName);
                if (command && underscore_1.default.isFunction(command.autocomplete)) {
                    command.autocomplete(session, args, callback);
                }
                else if (command && underscore_1.default.isFunction(command.autocompleteAsync)) {
                    return yield command.autocompleteAsync(session, args);
                }
                if (callback)
                    callback([]);
                return [];
            }
            catch (e) {
                session.stderr().write('Autocomplete fail: "' + JSON.stringify(e) + '"\n');
                throw e;
            }
        });
    }
}
exports.default = CorporalUtil;
/**
 * Determine if the given value is defined (i.e., isn't `null` or `undefined`)
 */
CorporalUtil.isDefined = (val) => {
    return (val !== null && val !== undefined);
};
CorporalUtil._matchString = (err, matches) => {
    if (!underscore_1.default.isString(err.code)) {
        return;
    }
    let handler = null;
    underscore_1.default.each(matches, function (matchAndHandler) {
        if (underscore_1.default.isFunction(handler)) {
            return;
        }
        else if (!underscore_1.default.isString(matchAndHandler.codeMatch)) {
            return;
        }
        else if (err.code === matchAndHandler.codeMatch) {
            handler = matchAndHandler.handler;
        }
    });
    return (underscore_1.default.isFunction(handler)) ? handler : null;
};
CorporalUtil._matchRegExp = (err, matches) => {
    if (!underscore_1.default.isString(err.code)) {
        return;
    }
    let handler = null;
    underscore_1.default.each(matches, function (matchAndHandler) {
        if (underscore_1.default.isFunction(handler)) {
            return;
        }
        else if (!underscore_1.default.isRegExp(matchAndHandler.codeMatch)) {
            return;
        }
        else if (matchAndHandler.codeMatch.test(err.code)) {
            handler = matchAndHandler.handler;
        }
    });
    return (underscore_1.default.isFunction(handler)) ? handler : null;
};
CorporalUtil._matchFunction = (err, matches) => {
    let handler = null;
    underscore_1.default.each(matches, matchAndHandler => {
        if (underscore_1.default.isFunction(handler)) {
            return;
        }
        else if (!underscore_1.default.isFunction(matchAndHandler.codeMatch)) {
            return;
        }
        else if (matchAndHandler.codeMatch(err.code)) {
            handler = matchAndHandler.handler;
        }
    });
    return (underscore_1.default.isFunction(handler)) ? handler : null;
};
CorporalUtil._matchNull = (err, matches) => {
    let handler = null;
    underscore_1.default.each(matches, function (matchAndHandler) {
        if (underscore_1.default.isFunction(handler)) {
            return;
        }
        else if (!underscore_1.default.isFunction(matchAndHandler.handler)) {
            return;
        }
        else {
            handler = matchAndHandler.handler;
        }
    });
    return (underscore_1.default.isFunction(handler)) ? handler : null;
};
/**
 * Return a function that returns the ps1 or ps2 prompt label, depending on `psVar`
 */
CorporalUtil.createPs = (session, psVar) => {
    return function () {
        return sprintf_js_1.sprintf(session.env(psVar), session.env());
    };
};
//# sourceMappingURL=util.js.map