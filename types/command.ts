import CorporalSession from "../lib/session";

export type Command = CallbackCommand | PromiseCommand;

/**
 * @deprecated Use PromiseCommand
 * @see PromiseCommand
 */
export interface CallbackCommand {
    description: string;
    help?: string;
    init?: (session: CorporalSession, callback: (err?: Error) => any) => void;
    invoke: (session: CorporalSession, args: any, callback: Function) => any;
    autocomplete?: (session: CorporalSession, args: any, callback: (...arg: string[]) => string[]) => void;
}

export interface PromiseCommand {
    description: string;
    help?: string;
    initAsync?: (session: CorporalSession) => Promise<void>;
    invokeAsync: (session: CorporalSession, args: any) => Promise<any>;
    autocompleteAsync?: (session: CorporalSession, args: any) => Promise<string[]>;
}

export type Commands = { [commaName: string]: Command };

export type CommandsCallback = (err: any, commands?: Commands) => any;
