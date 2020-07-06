import _ from "underscore";
import {sprintf} from "sprintf-js";

import {usage} from "optimist";
import CorporalSession from "../lib/session";
import { WriteStream } from "tty";
import { Command } from '../types/command';

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
export default {
    description: _getDescription(),
    help: sprintf('Usage: %s', _getOptimist().help()),
    init: async (session: CorporalSession) => {
        const allSettings = session.env('corporal_command_settings');
        const helpSettings = allSettings.help = _.isObject(allSettings.help) ?
            allSettings.help : {};

        // Ensure the `hide` setting is set in the help settings
        helpSettings.hide = (_.isArray(helpSettings.hide)) ? helpSettings.hide : [];
    },
    invoke: async (session: CorporalSession, args: any) => {
        const argv = _getOptimist().parse(args);
        const commandName = argv._[0];

        // A hidden ability of the `help` command is to output standard output on
        // stderr. Really only useful for API-level interaction, so it's not
        // advertised in the user-facing help
        const out: WriteStream = (argv['stderr']) ? session.stderr() : session.stdout();

        if (commandName) {
            const command = session.commands().get(commandName);
            if (command) {
                out.write('\n');
                out.write(command.description + '\n');
                out.write('\n');

                if (_.isString(command.help)) {
                    out.write(command.help + '\n');
                    out.write('\n');
                }
            } else {
                // When the command name was wrong, it always outputs on stderr, not the
                // suggested output stream
                session.stderr().write('No command found with name: "' + commandName + '"\n');
            }
        } else {
            out.write('List of available commands:\n');
            out.write('\n');

            const settings = session.env('corporal_command_settings').help;

            // Determine the width of the command name column
            let longestNameLength = 0;
            _.chain(session.commands().get())
                .keys()
                .difference(settings.hide)
                .map(function(commandName) {
                    return commandName.length;
                })
                .each((currentLength) => {
                    longestNameLength = Math.max(currentLength, longestNameLength);
                });

            // Output each command that isn't hidden from the index
            _.chain(session.commands().get())
                .keys()
                .difference(settings.hide)
                .each((commandName) => {
                    const command = session.commands().get(commandName);
                    out.write(sprintf('%-' + longestNameLength + 's:  %s', commandName, command.description.split('\n')[0]));
                    out.write('\n');
                });

            out.write('\n');
        }
    },
    autocomplete: async (session: CorporalSession, args: any) => {
        if (args.length !== 1) {
            return;
        }

        // Filter by command names
        return _.chain(session.commands().get()).keys()
            .filter(commandName => {
                return (commandName.indexOf(args[0]) === 0);
            })
            .value();
    }
} as Command;

function _getDescription() {
    return 'Show a dialog of all available commands.';
}

function _getOptimist() {
    return usage('help [<command>]');
}
