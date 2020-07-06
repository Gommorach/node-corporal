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
const sprintf_js_1 = require("sprintf-js");
const optimist_1 = require("optimist");
/**
 * Help command.
 *
 * Shows a dialog of all available commands. The help command can be configured with the following
 * settings from the standard `corporal_command_settings` environment variable:
 *
 *  ## corporal_command_settings
 *
 *      * `help.hide`:  A string array indicating the command names to omit when listing the
 *                      available commands. The commands will not be ommitted when the command
 *                      is run explicitly indicating the command name. E.g., if you hide `clear`,
 *                      if the user executes `help clear`, the help content for clear will still
 *                      be displayed. This setting only impacts the help list index.
 */
exports.default = {
    description: _getDescription(),
    help: sprintf_js_1.sprintf('Usage: %s', _getOptimist().help()),
    init: (session) => __awaiter(void 0, void 0, void 0, function* () {
        const allSettings = session.env('corporal_command_settings');
        const helpSettings = allSettings.help = underscore_1.default.isObject(allSettings.help) ?
            allSettings.help : {};
        // Ensure the `hide` setting is set in the help settings
        helpSettings.hide = (underscore_1.default.isArray(helpSettings.hide)) ? helpSettings.hide : [];
    }),
    invoke: (session, args) => __awaiter(void 0, void 0, void 0, function* () {
        const argv = _getOptimist().parse(args);
        const commandName = argv._[0];
        // A hidden ability of the `help` command is to output standard output on
        // stderr. Really only useful for API-level interaction, so it's not
        // advertised in the user-facing help
        const out = (argv['stderr']) ? session.stderr() : session.stdout();
        if (commandName) {
            const command = session.commands().get(commandName);
            if (command) {
                out.write('\n');
                out.write(command.description + '\n');
                out.write('\n');
                if (underscore_1.default.isString(command.help)) {
                    out.write(command.help + '\n');
                    out.write('\n');
                }
            }
            else {
                // When the command name was wrong, it always outputs on stderr, not the
                // suggested output stream
                session.stderr().write('No command found with name: "' + commandName + '"\n');
            }
        }
        else {
            out.write('List of available commands:\n');
            out.write('\n');
            const settings = session.env('corporal_command_settings').help;
            // Determine the width of the command name column
            let longestNameLength = 0;
            underscore_1.default.chain(session.commands().get())
                .keys()
                .difference(settings.hide)
                .map(function (commandName) {
                return commandName.length;
            })
                .each((currentLength) => {
                longestNameLength = Math.max(currentLength, longestNameLength);
            });
            // Output each command that isn't hidden from the index
            underscore_1.default.chain(session.commands().get())
                .keys()
                .difference(settings.hide)
                .each((commandName) => {
                const command = session.commands().get(commandName);
                out.write(sprintf_js_1.sprintf('%-' + longestNameLength + 's:  %s', commandName, command.description.split('\n')[0]));
                out.write('\n');
            });
            out.write('\n');
        }
    }),
    autocomplete: (session, args) => __awaiter(void 0, void 0, void 0, function* () {
        if (args.length !== 1) {
            return;
        }
        // Filter by command names
        return underscore_1.default.chain(session.commands().get()).keys()
            .filter(commandName => {
            return (commandName.indexOf(args[0]) === 0);
        })
            .value();
    })
};
function _getDescription() {
    return 'Show a dialog of all available commands.';
}
function _getOptimist() {
    return optimist_1.usage('help [<command>]');
}
//# sourceMappingURL=help.js.map