"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commands_1 = __importDefault(require("./commands"));
const util_1 = __importDefault(require("./util"));
class CorporalSession {
    constructor(options = {}) {
        this._quit = false;
        this._commands = new commands_1.default(options.commandContexts);
        this._env = options.env || {};
        this._errorHandlers = options.errorHandlers || [];
        this._stdout = options.stdout || process.stdout;
        this._stderr = options.stderr || process.stderr;
        this._stdin = options.stdin || process.stdin;
    }
    ;
    commands() {
        return this._commands;
    }
    ;
    env(key, val) {
        if (util_1.default.isDefined(key) && val !== undefined) {
            this._env[key] = val;
        }
        else if (util_1.default.isDefined(key)) {
            return this._env[key];
        }
        else {
            return this._env;
        }
    }
    ;
    errorHandlers(errorHandlers) {
        if (errorHandlers) {
            this._errorHandlers = errorHandlers;
        }
        return this._errorHandlers;
    }
    ;
    stdout(stdout) {
        if (stdout) {
            this._stdout = stdout;
        }
        return this._stdout;
    }
    ;
    stderr(stderr) {
        if (stderr) {
            this._stderr = stderr;
        }
        return this._stderr;
    }
    ;
    stdin(stdin) {
        if (stdin) {
            this._stdin = stdin;
        }
        return this._stdin;
    }
    ;
    get quit() {
        return this._quit;
    }
    set quit(value) {
        this._quit = value;
    }
}
exports.default = CorporalSession;
//# sourceMappingURL=session.js.map