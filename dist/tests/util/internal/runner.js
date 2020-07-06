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
const optimist_1 = __importDefault(require("optimist"));
const assert_1 = __importDefault(require("assert"));
const index_1 = __importDefault(require("../../../index"));
const TypeAError_1 = __importDefault(require("./errors/TypeAError"));
const TypeBError_1 = __importDefault(require("./errors/TypeBError"));
const argv = optimist_1.default.argv;
let commandContexts = null;
if (argv.contexts) {
    commandContexts = {};
    underscore_1.default.each(argv.contexts, (commandNames, contextName) => {
        commandContexts[contextName] = { commands: commandNames.split(',') };
    });
}
const corporal = new index_1.default({
    commands: argv.commands,
    commandContexts: commandContexts,
    disabled: underscore_1.default.isString(argv.disabled) ? argv.disabled.split(',') : null,
    env: JSON.parse(argv.env)
});
/**
 * Verify string precedence over all the things
 */
corporal.onCommandError(TypeAError_1.default, 'isastringmatch', (err, session) => __awaiter(void 0, void 0, void 0, function* () {
    assert_1.default.ok(session);
    console.log('TypeAError: isastringmatch');
}));
corporal.onCommandError(TypeAError_1.default, /^isastringmatch/, (err, session) => __awaiter(void 0, void 0, void 0, function* () {
    assert_1.default.ok(session);
    console.log('TypeAError: isaregexpmatch');
}));
corporal.onCommandError(TypeAError_1.default, (code) => (code === 'isastringmatch'), (err, session) => __awaiter(void 0, void 0, void 0, function* () {
    assert_1.default.ok(session);
    console.log('TypeAError: isafunctionmatch');
}));
/**
 * Verify regexp precedence over functions
 */
corporal.onCommandError(TypeAError_1.default, /^isaregexpmatch/, (err, session) => __awaiter(void 0, void 0, void 0, function* () {
    assert_1.default.ok(session);
    console.log('TypeAError: isaregexpmatch');
}));
corporal.onCommandError(TypeAError_1.default, (code) => code === 'isaregexpmatch', (err, session) => __awaiter(void 0, void 0, void 0, function* () {
    assert_1.default.ok(session);
    console.log('TypeAError: isafunctionmatch');
}));
/**
 * Verify function will match
 */
corporal.onCommandError(TypeAError_1.default, (code) => code === 'isafunctionmatch', (err, session) => __awaiter(void 0, void 0, void 0, function* () {
    assert_1.default.ok(session);
    console.log('TypeAError: isafunctionmatch');
}));
/**
 * Verify null code matches
 */
corporal.onCommandError(TypeAError_1.default, (err, session) => {
    assert_1.default.ok(session);
    console.log('TypeAError: isanullmatch 0');
});
corporal.onCommandError(TypeAError_1.default, (err, session) => __awaiter(void 0, void 0, void 0, function* () {
    assert_1.default.ok(session);
    console.log('TypeAError: isanullmatch 1');
}));
/**
 * Verify string precedence
 */
corporal.onCommandError(TypeAError_1.default, 'teststringprecedence', (err, session) => __awaiter(void 0, void 0, void 0, function* () {
    assert_1.default.ok(session);
    console.log('TypeAError: teststringprecedence 0');
}));
corporal.onCommandError(TypeAError_1.default, 'teststringprecedence', (err, session) => __awaiter(void 0, void 0, void 0, function* () {
    assert_1.default.ok(session);
    console.log('TypeAError: teststringprecedence 1');
}));
/**
 * Verify regexp precedence
 */
corporal.onCommandError(TypeAError_1.default, 'testregexpprecedence', (err, session) => __awaiter(void 0, void 0, void 0, function* () {
    assert_1.default.ok(session);
    console.log('TypeAError: testregexpprecedence 0');
}));
corporal.onCommandError(TypeAError_1.default, 'testregexpprecedence', (err, session) => __awaiter(void 0, void 0, void 0, function* () {
    assert_1.default.ok(session);
    console.log('TypeAError: testregexpprecedence 1');
}));
/**
 * Verify function precedence
 */
corporal.onCommandError(TypeAError_1.default, 'testfunctionprecedence', (err, session) => __awaiter(void 0, void 0, void 0, function* () {
    assert_1.default.ok(session);
    console.log('TypeAError: testfunctionprecedence 0');
}));
corporal.onCommandError(TypeAError_1.default, 'testfunctionprecedence', (err, session) => __awaiter(void 0, void 0, void 0, function* () {
    assert_1.default.ok(session);
    console.log('TypeAError: testfunctionprecedence 1');
}));
/**
 * Verify it can resolve TypeBError if it wants to
 */
corporal.onCommandError(TypeBError_1.default, 'isastringmatch', (err, session) => __awaiter(void 0, void 0, void 0, function* () {
    assert_1.default.ok(session);
    console.log('TypeBError: isastringmatch');
}));
/**
 * Verify type precedence
 */
corporal.onCommandError(Error, 'isastringmatch', (err, session) => __awaiter(void 0, void 0, void 0, function* () {
    assert_1.default.ok(session);
    console.log('Error: isastringmatch');
}));
3;
/**
 * Verify a catch-all for all "Error" types that don't match anything else
 */
corporal.onCommandError(Error, (err, session) => __awaiter(void 0, void 0, void 0, function* () {
    assert_1.default.ok(session);
    console.log('Error: catchall');
}));
corporal.on('load', () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield corporal.loop();
        return process.exit(0);
    }
    catch (err) {
        return process.exit(1);
    }
}));
//# sourceMappingURL=runner.js.map