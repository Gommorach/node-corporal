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
const index_1 = __importDefault(require("./index"));
const sprintf_js_1 = require("sprintf-js");
const corporal = new index_1.default({
    'commands': `${__dirname}/commands`,
    'commandContexts': {
        '*': {
            'commands': [
                'ally-ctx',
                'bb-ctx',
                'canvas-ctx',
                'd2l-ctx',
                'moodle-ctx',
                'wcm-ctx'
            ]
        },
    }
});
corporal.onCommandError(Error, function (err, session) {
    return __awaiter(this, void 0, void 0, function* () {
        session.stderr().write(`${'An unexpected error occurred'}\n`);
        session.stderr().write(`${err.stack}\n`);
        session.quit = true;
    });
});
corporal.on('load', () => __awaiter(void 0, void 0, void 0, function* () {
    if (process.argv[2] === '--') {
        // All commands are already provided over standard in
        yield processCommandsFromArgv();
    }
    else {
        // Use regular std in loop
        yield corporal.loop();
    }
}));
/**
 * Parse out the commands that were passed in as arguments. Each command should be separated by a double dash.
 */
function processCommandsFromArgv() {
    return __awaiter(this, void 0, void 0, function* () {
        const allArgs = process.argv.slice(3);
        const accumulator = allArgs.reduce(({ commands, command }, currentValue) => {
            if (currentValue === '--') {
                // Add the last command to the set of commands. Ignore sequential double dashes however.
                // e.g. ally-support -- ally-ctx -- -- should result in one `ally-ctx` command
                if (command.length > 0) {
                    commands.push(command);
                    command = [];
                }
            }
            else {
                command.push(currentValue);
            }
            return { commands, command };
        }, { 'commands': [], 'command': [] });
        accumulator.commands.push(accumulator.command);
        yield processCommands(accumulator.commands);
    });
}
/**
 * Sequentially process a set of commands
 *
 * @param  {Array<String[]>}    commands     The array of commands to process. Each item in the array is a command
 */
function processCommands(commands) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (commands.length === 0) {
                return;
            }
            const command = commands.shift();
            // Pretty-print the command
            const cmdStr = command.reduce((acc, s) => {
                if (s.indexOf(' ') !== -1) {
                    return `${acc} "${s}"`;
                }
                else {
                    return `${acc} ${s}`;
                }
            }, '');
            const ps1 = sprintf_js_1.sprintf(corporal.session.env('ps1'), corporal.session.env());
            corporal.session.stdout().write(`${ps1} ${cmdStr}\n`);
            // Run the command
            yield corporal.exec(command[0], command.slice(1));
            yield processCommands(commands);
        }
        catch (err) {
            corporal.session.stderr().write('Received an unexpected error, aborting command processing\n');
            corporal.session.stderr().write(`${err.message}\n`);
            corporal.session.stderr().write(`${err.stack}\n`);
            return;
        }
    });
}
//# sourceMappingURL=run.js.map