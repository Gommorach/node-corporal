import { ErrorCode } from './TypeAError';

export default class TypeBError extends Error {
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
