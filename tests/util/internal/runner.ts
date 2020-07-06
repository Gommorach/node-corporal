import _ from 'underscore';
import optimist from 'optimist';

import assert from 'assert';

import Corporal from '../../../index';
import TypeAError, { ErrorCode } from './errors/TypeAError';
import TypeBError from './errors/TypeBError';
import { CommandContexts } from '../../../types/command-contexts';
import CorporalSession from "../../../lib/session";

const argv = optimist.argv;

let commandContexts: CommandContexts = null;
if (argv.contexts) {
    commandContexts = {};
    _.each(argv.contexts, (commandNames: string, contextName: string) => {
        commandContexts[contextName] = { commands: commandNames.split(',') };
    });
}

const corporal = new Corporal({
    commands: argv.commands,
    commandContexts: commandContexts,
    disabled: _.isString(argv.disabled) ? argv.disabled.split(',') : null,
    env: JSON.parse(argv.env)
});

/**
 * Verify string precedence over all the things
 */

corporal.onCommandError(
    TypeAError,
    'isastringmatch',
    async (err: Error, session: CorporalSession) => {
        assert.ok(session);
        console.log('TypeAError: isastringmatch');
    }
);

corporal.onCommandError(
    TypeAError,
    /^isastringmatch/,
    async (err: Error, session: CorporalSession) => {
        assert.ok(session);
        console.log('TypeAError: isaregexpmatch');
    }
);


corporal.onCommandError(
    TypeAError,
    (code: ErrorCode) => (code === 'isastringmatch'),
    async (err, session) => {
        assert.ok(session);
        console.log('TypeAError: isafunctionmatch');
    }
);


/**
 * Verify regexp precedence over functions
 */
corporal.onCommandError(
    TypeAError,
    /^isaregexpmatch/,
    async (err: Error, session: CorporalSession) => {
        assert.ok(session);
        console.log('TypeAError: isaregexpmatch');
    }
);

corporal.onCommandError(
    TypeAError,
    (code: ErrorCode) => code === 'isaregexpmatch',
    async (err: Error, session: CorporalSession) => {
        assert.ok(session);
        console.log('TypeAError: isafunctionmatch');
    }
);


/**
 * Verify function will match
 */

corporal.onCommandError(
    TypeAError,
    (code: ErrorCode) => code === 'isafunctionmatch',
    async (err: Error, session: CorporalSession) => {
        assert.ok(session);
        console.log('TypeAError: isafunctionmatch');
    }
);


/**
 * Verify null code matches
 */

corporal.onCommandError(
    TypeAError,
     (err: Error, session: CorporalSession) => {
        assert.ok(session);
        console.log('TypeAError: isanullmatch 0');
    }
);

corporal.onCommandError(
    TypeAError,
    async (err: Error, session: CorporalSession) => {
        assert.ok(session);
        console.log('TypeAError: isanullmatch 1');
    }
);


/**
 * Verify string precedence
 */

corporal.onCommandError(
    TypeAError,
    'teststringprecedence',
    async (err: Error, session: CorporalSession) => {
        assert.ok(session);
        console.log('TypeAError: teststringprecedence 0');
    }
);

corporal.onCommandError(
    TypeAError,
    'teststringprecedence',
    async (err: Error, session: CorporalSession) => {
        assert.ok(session);
        console.log('TypeAError: teststringprecedence 1');
    }
);


/**
 * Verify regexp precedence
 */
corporal.onCommandError(
    TypeAError,
    'testregexpprecedence',
    async (err: Error, session: CorporalSession) => {
        assert.ok(session);
        console.log('TypeAError: testregexpprecedence 0');
    }
);

corporal.onCommandError(
    TypeAError,
    'testregexpprecedence',
    async (err: Error, session: CorporalSession) => {
        assert.ok(session);
        console.log('TypeAError: testregexpprecedence 1');
    }
);


/**
 * Verify function precedence
 */
corporal.onCommandError(
    TypeAError,
    'testfunctionprecedence',
    async (err: Error, session: CorporalSession) => {
        assert.ok(session);
        console.log('TypeAError: testfunctionprecedence 0');
    }
);

corporal.onCommandError(
    TypeAError,
    'testfunctionprecedence',
    async (err: Error, session: CorporalSession) => {
        assert.ok(session);
        console.log('TypeAError: testfunctionprecedence 1');
    }
);


/**
 * Verify it can resolve TypeBError if it wants to
 */
corporal.onCommandError(
    TypeBError,
    'isastringmatch',
    async (err: Error, session: CorporalSession) => {
        assert.ok(session);
        console.log('TypeBError: isastringmatch');
    }
);


/**
 * Verify type precedence
 */
corporal.onCommandError(
    Error,
    'isastringmatch',
    async (err: Error, session: CorporalSession) => {
        assert.ok(session);
        console.log('Error: isastringmatch');

    });
3

/**
 * Verify a catch-all for all "Error" types that don't match anything else
 */
corporal.onCommandError(Error, async (err: Error, session: CorporalSession) => {
    assert.ok(session);
    console.log('Error: catchall');
});

corporal.on('load', async () => {
    try {
        await corporal.loop();
        return process.exit(0);
    } catch (err) {
        return process.exit(1);
    }
});
