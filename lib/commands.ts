import _ from 'underscore';
import { sprintf } from "sprintf-js";

import CorporalUtil from "./util";
import { Command, Commands } from "../types/command";
import { CommandContexts } from "../types/command-contexts";

/**
 * Convenience object fo    r managing the list of available commands, and filtering
 * them by the current context.
 */

export default class CorporalCommands {
    private commands: Commands = {};
    private _ctx: string;

    private readonly ctxs: CommandContexts;

    constructor(commandContexts: CommandContexts) {
        this.ctxs = _.extend({}, commandContexts);
    }

    /**
     * Get or set the current command context.
     */
    public ctx = (ctx: string) => {
        if (CorporalUtil.isDefined(ctx)) {
            this._ctx = ctx;
        }
        return this._ctx;
    };


    /**
     * Get *all* or one of *all* the available commands, regardless of current context.
     */
    public all = (name?: string) => {
        if (CorporalUtil.isDefined(name)) {
            return this.commands[name];
        }

        return _.extend({}, this.commands);
    };


    /**
     * Get a current command in context, or get all the current commands in context. If
     * the command `name` does not specify the name of a command in context, this returns
     * a falsey value.
     */
    public get: any = (name?: string) => {
        if (CorporalUtil.isDefined(name)) {
            return this.get()[name];
        }
        return { ...this.getCommandsForContext(this._ctx), ...this.getCommandsForContext('*') };
    };

    /**
     * Add a command to the list of `all` available commands.
     */
    public set = (name: string, command: Command) => {
        CorporalCommands._validateCommand(name, command);
        this.commands[name] = command;
    };


    /**
     * Given a context name, return all the commands available in that context.
     */
    private getCommandsForContext = (ctx: string) => {
        const commandsToReturn: any = {};
        const commandNames = (this.ctxs[ctx] && this.ctxs[ctx].commands);
        _.each(commandNames, commandName => {
            const command = this.all()[commandName];
            if (command) {
                commandsToReturn[commandName] = command;
            }
        });

        return commandsToReturn;
    };

    /**
     * Validate that the provided command has all the required information needed
     * for a corporal command
     */
    private static _validateCommand = (name: string, command: any) => {
        if (!_.isString(command.description)) {
            throw new Error(sprintf('Command "%s" must have a description string', name));
        } else if (!_.isFunction(command.invoke)) {
            throw new Error(sprintf('Command "%s" must have an invoke function', name));
        }
    }

};
