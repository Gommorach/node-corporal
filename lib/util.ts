import _ from "underscore";
import "colors";
import domain from "domain";
import readcommand from "readcommand";
import {sprintf} from "sprintf-js";
import CorporalSession from "./session";
import {Handler} from "../types/handler";
import {Codematch} from "../types/codematch";
import commands from "./commands";

type UtilError = Error & { code?: 'SIGINT' }
type CodeMatchAndHandler = { codeMatch?: Codematch, handler?: Handler }


export default class CorporalUtil {
    /**
     * Determine if the given value is defined (i.e., isn't `null` or `undefined`)
     */
    public static isDefined = (val: null | undefined | any) => {
        return (val !== null && val !== undefined);
    };


    /**
     * Continuously prompt the user for commands while invoking each command they provide.
     * The Promise is resolved when the user has exited.
     */
    public static async doCommandLoop(options: { session: CorporalSession, history: any[] }): Promise<void> {
        const session = options.session;
        const history = options.history || [];

        readcommand.loop({
            input: session.stdin(),
            output: session.stdout(),
            ps1: CorporalUtil.createPs(session, 'ps1'),
            ps2: CorporalUtil.createPs(session, 'ps2'),
            autocomplete: await CorporalUtil._createAutocomplete(session),
            history: history
        }, async (err: UtilError, args: any[], str: string, next: Function) => {
            if (err && err.code !== 'SIGINT') {
                // An unexpected error occurred
                throw err;
            } else if (err) {
                // User hit CTRL+C, just clear the prompt and jump to the next command
                next();
                return;
            }

            args = _.compact(args);
            if (_.isEmpty(args)) {
                next();
                return;
            }

            // Invoke the executed command
            const commandName = args.shift();
            await CorporalUtil.invokeCommand(session, commandName, args);
            if (session.quit) {
                // If the command quit the session, do not prompt for another command
                return;
            }

            // Otherwise, we continue prompting
            next();
        });
    };


    /**
     * Programmatically invoke a command using the command name and parsed arguments. Note this function
     * ignores the state of `session.quit()` as quitting the session only impacts the user command loop
     */
    public static async invokeCommand(session: CorporalSession, commandName: string, args: any[]) {
        if (commandName.match(/^\s*#/)) {
            // Commands that begin with a hash are commented out, ignore them
            return;
        }

        const command = session.commands().get(commandName);
        if (!command) {
            // If the command did not exist, show the command list
            // on stderr and prepare for the next command
            session.stderr().write(('Invalid command: ' as string & { red: any }).red + (commandName as string & { white: any }).white + '\n');
            session.stderr().write('\n\n');
            await CorporalUtil.invokeCommand(session, 'help', ['--stderr']);
            return;
        }

        // Wrap the invocation into a domain to catch any errors that are thrown from the command
        const commandDomain = domain.create();
        commandDomain.once('error', async (err: UtilError) => {
            // Hand any errors over to the error handler
            await CorporalUtil._handleError(err, session);
            return;
        });

        // Make the domain active, then inactive immediately after the command has returned
        commandDomain.enter();
        command.invoke(session, args, async (err: UtilError) => {
            commandDomain.exit();

            // Hand any errors over to the error handler
            if (err) {
                await CorporalUtil._handleError(err, session);
                return;
            }

            return;
        });
    };

    private static async _handleError(err: UtilError, session: CorporalSession) {
        // Get the first applicable handler
        const handlersForType = _.chain(session.errorHandlers())
            .filter(handlersForType => (err instanceof (handlersForType as any).type))
            .first()
            .value();
        if (!handlersForType) {
            throw err;
        }

        // Resolve the handler for this error based on code match in priority order
        const handler: Handler =
            CorporalUtil._matchString(err, handlersForType['string']) ||
            CorporalUtil._matchRegExp(err, handlersForType['regexp']) ||
            CorporalUtil._matchFunction(err, handlersForType['function']) ||
            CorporalUtil._matchNull(err, handlersForType['null']);

        // If we could not find a handler that matches this we promote the error
        if (!handler) {
            throw err;
        }

        // Invoke the handler we found
        await handler(err, session);
    };

    private static _matchString = (err: UtilError, matches: CodeMatchAndHandler[]) => {
        if (!_.isString(err.code)) {
            return;
        }

        let handler: null | Function | any = null;
        _.each(matches, function (matchAndHandler: { codeMatch?: any, handler?: Handler }) {
            if (_.isFunction(handler)) {
                return;
            } else if (!_.isString(matchAndHandler.codeMatch)) {
                return;
            } else if (err.code === matchAndHandler.codeMatch) {
                handler = matchAndHandler.handler;
            }
        });

        return (_.isFunction(handler)) ? handler : null;
    };

    private static _matchRegExp = (err: UtilError, matches: CodeMatchAndHandler[]) => {
        if (!_.isString(err.code)) {
            return;
        }

        let handler: null | Function | Handler = null;
        _.each(matches, function (matchAndHandler: CodeMatchAndHandler) {
            if (_.isFunction(handler)) {
                return;
            } else if (!_.isRegExp(matchAndHandler.codeMatch)) {
                return;
            } else if (matchAndHandler.codeMatch.test(err.code)) {
                handler = matchAndHandler.handler;
            }
        });

        return (_.isFunction(handler)) ? handler : null;
    };

    private static _matchFunction = (err: UtilError, matches: CodeMatchAndHandler[]) => {
        let handler: null | Handler = null;
        _.each(matches, matchAndHandler => {
            if (_.isFunction(handler)) {
                return;
            } else if (!_.isFunction(matchAndHandler.codeMatch)) {
                return;
            } else if (matchAndHandler.codeMatch(err.code)) {
                handler = matchAndHandler.handler;
            }
        });

        return (_.isFunction(handler)) ? handler : null;
    };

    private static _matchNull = (err: UtilError, matches: CodeMatchAndHandler[]) => {
        let handler: null | Handler | Function = null;
        _.each(matches, function (matchAndHandler) {
            if (_.isFunction(handler)) {
                return;
            } else if (!_.isFunction(matchAndHandler.handler)) {
                return;
            } else {
                handler = matchAndHandler.handler;
            }
        });

        return (_.isFunction(handler)) ? handler : null;
    };

    /**
     * Return a function that returns the ps1 or ps2 prompt label, depending on `psVar`
     */
    private static createPs = (session: CorporalSession, psVar: string) => {
        return function () {
            return sprintf(session.env(psVar), session.env());
        };
    };

    /**
     * Create an autocompleter function that autocompletes based on the commands in the session
     */
    private static _createAutocomplete(session: CorporalSession): (args: string[]) => Promise<string[]> {
        return async (args: string[], callback?: Function): Promise<string[]> => {
            try {
                args = args.slice();
                const allCommandNames = _.keys(session.commands().get());

                // First handle the case where this is an auto-suggest based on finding the command name
                if (_.isEmpty(args)) {
                    if (callback) callback(allCommandNames);
                    return allCommandNames;
                } else if (args.length === 1) {
                    const matchingCommands = _.filter(allCommandNames, (commandName) => {
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
                if (command && _.isFunction(command.autocomplete)) {
                    command.autocomplete(session, args, callback);
                } else if (command && _.isFunction(command.autocompleteAsync)) {
                    return await command.autocompleteAsync(session, args);
                }

                if (callback) callback([]);
                return [];
            } catch (e) {
                session.stderr().write('Autocomplete fail: "' + JSON.stringify(e) + '"\n');
                throw e;
            }
        };
    }
}
