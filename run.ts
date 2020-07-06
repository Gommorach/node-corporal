import Corporal from "./index";
import {sprintf} from "sprintf-js";
import * as _ from "underscore";

const corporal = new Corporal({
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

corporal.onCommandError(Error, async function(err, session) {
    session.stderr().write(`${'An unexpected error occurred'}\n`);
    session.stderr().write(`${err.stack}\n`);
    session.quit = true;
});

corporal.on('load', async () => {
    if (process.argv[2] === '--') {
        // All commands are already provided over standard in
        await processCommandsFromArgv();
    } else {
        // Use regular std in loop
        await corporal.loop();
    }
});

/**
 * Parse out the commands that were passed in as arguments. Each command should be separated by a double dash.
 */
async function processCommandsFromArgv() {
    const allArgs = process.argv.slice(3);
    const accumulator = allArgs.reduce(({commands, command}, currentValue) => {
        if (currentValue === '--') {
            // Add the last command to the set of commands. Ignore sequential double dashes however.
            // e.g. ally-support -- ally-ctx -- -- should result in one `ally-ctx` command
            if (command.length > 0) {
                commands.push(command);
                command = [];
            }
        } else {
            command.push(currentValue);
        }
        return {commands, command};
    }, {'commands': [], 'command': []});
    accumulator.commands.push(accumulator.command);
    await processCommands(accumulator.commands);
}

/**
 * Sequentially process a set of commands
 *
 * @param  {Array<String[]>}    commands     The array of commands to process. Each item in the array is a command
 */
async function processCommands(commands: string[][]) {
    try {
        if (commands.length === 0) {
            return;
        }

        const command = commands.shift();

        // Pretty-print the command
        const cmdStr = command.reduce((acc, s) => {
            if (s.indexOf(' ') !== -1) {
                return `${acc} "${s}"`;
            } else {
                return `${acc} ${s}`;
            }
        }, '');
        const ps1 = sprintf(corporal.session.env('ps1'), corporal.session.env());
        corporal.session.stdout().write(`${ps1} ${cmdStr}\n`);

        // Run the command

        await corporal.exec(command[0], command.slice(1));
        await processCommands(commands);

    } catch(err) {
            corporal.session.stderr().write('Received an unexpected error, aborting command processing\n');
            corporal.session.stderr().write(`${err.message}\n`);
            corporal.session.stderr().write(`${err.stack}\n`);
            return;

    }
}
