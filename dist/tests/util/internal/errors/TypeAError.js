"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TypeAError extends Error {
    constructor(code, message) {
        super();
        Error.call(this);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.code = code;
        this.message = message;
    }
    ;
}
exports.default = TypeAError;
//# sourceMappingURL=TypeAError.js.map