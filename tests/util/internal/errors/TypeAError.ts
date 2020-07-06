export type ErrorCode = 'isastringmatch' | 'isaregexpmatch' | 'isafunctionmatch' | 'teststringprecedence';

export default class TypeAError extends Error {
    private code: ErrorCode;

    constructor(code: ErrorCode, message: string) {
        super();
        Error.call(this);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;

        this.code = code;
        this.message = message;
    };
}
