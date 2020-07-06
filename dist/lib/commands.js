"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const underscore_1 = __importDefault(require("underscore"));
const sprintf_js_1 = require("sprintf-js");
const util_1 = __importDefault(require("./util"));
/**
 * Convenience object fo    r managing the list of available commands, and filtering
 * them by the current context.
 */
class CorporalCommands {
    constructor(commandContexts) {
        this.commands = {};
        /**
         * Get or set the current command context.
         */
        this.ctx = (ctx) => {
            if (util_1.default.isDefined(ctx)) {
                this._ctx = ctx;
            }
            return this._ctx;
        };
        /**
         * Get *all* or one of *all* the available commands, regardless of current context.
         */
        this.all = (name) => {
            if (util_1.default.isDefined(name)) {
                return this.commands[name];
            }
            return underscore_1.default.extend({}, this.commands);
        };
        /**
         * Get a current command in context, or get all the current commands in context. If
         * the command `name` does not specify the name of a command in context, this returns
         * a falsey value.
         */
        this.get = (name) => {
            if (util_1.default.isDefined(name)) {
                return this.get()[name];
            }
            return Object.assign(Object.assign({}, this.getCommandsForContext(this._ctx)), this.getCommandsForContext('*'));
        };
        /**
         * Add a command to the list of `all` available commands.
         */
        this.set = (name, command) => {
            CorporalCommands._validateCommand(name, command);
            this.commands[name] = command;
        };
        /**
         * Given a context name, return all the commands available in that context.
         */
        this.getCommandsForContext = (ctx) => {
            const commandsToReturn = {};
            const commandNames = (this.ctxs[ctx] && this.ctxs[ctx].commands);
            underscore_1.default.each(commandNames, commandName => {
                const command = this.all()[commandName];
                if (command) {
                    commandsToReturn[commandName] = command;
                }
            });
            return commandsToReturn;
        };
        this.ctxs = underscore_1.default.extend({}, commandContexts);
    }
}
exports.default = CorporalCommands;
/**
 * Validate that the provided command has all the required information needed
 * for a corporal command
 */
CorporalCommands._validateCommand = (name, command) => {
    if (!underscore_1.default.isString(command.description)) {
        throw new Error(sprintf_js_1.sprintf('Command "%s" must have a description string', name));
    }
    else if (!underscore_1.default.isFunction(command.invoke)) {
        throw new Error(sprintf_js_1.sprintf('Command "%s" must have an invoke function', name));
    }
};
;
//# sourceMappingURL=commands.js.map