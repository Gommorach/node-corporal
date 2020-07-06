import {ErrorHandler} from '../types/handler';

import CorporalCommands from "./commands";
import CorporalUtil from "./util";
import {ReadStream, WriteStream} from "tty";

export interface CorporalSessionOptions {
    commandContexts?: any;
    commands?: string | any;
    env?: any;
    errorHandlers?: ErrorHandler[]
    stdin?: ReadStream;
    stdout?: WriteStream;
    stderr?: WriteStream;
}

export default class CorporalSession {
    private readonly _commands: CorporalCommands;
    private readonly _env: any;
    private _errorHandlers: ErrorHandler[];
    private _stdout: WriteStream;
    private _stderr: WriteStream;
    private _stdin: ReadStream;
    private _quit = false;

    constructor(options: CorporalSessionOptions = {}) {
        this._commands = new CorporalCommands(options.commandContexts);
        this._env = options.env || {};
        this._errorHandlers = options.errorHandlers || [];
        this._stdout = options.stdout || process.stdout;
        this._stderr = options.stderr || process.stderr;
        this._stdin = options.stdin || process.stdin;
    };

    public commands() {
        return this._commands;
    };

    public env(key?: string, val?: any) {
        if (CorporalUtil.isDefined(key) && val !== undefined) {
            this._env[key] = val;
        } else if (CorporalUtil.isDefined(key)) {
            return this._env[key];
        } else {
            return this._env;
        }
    };

    public errorHandlers(errorHandlers?: ErrorHandler[]) {
        if (errorHandlers) {
            this._errorHandlers = errorHandlers;
        }

        return this._errorHandlers;
    };

    public stdout(stdout?: WriteStream): WriteStream {
        if (stdout) {
            this._stdout = stdout;
        }

        return this._stdout;
    };

    public stderr(stderr?: WriteStream): WriteStream {
        if (stderr) {
            this._stderr = stderr;
        }

        return this._stderr;
    };

    public stdin(stdin?: ReadStream): ReadStream {
        if (stdin) {
            this._stdin = stdin;
        }

        return this._stdin;
    };

    public get quit(): boolean {
        return this._quit;
    }

    public set quit(value: boolean) {
        this._quit = value;
    }
}
