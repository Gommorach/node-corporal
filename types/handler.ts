import CorporalSession from '../lib/session';
import { Codematch } from './codematch';

export type Handler = (err: Error, session: CorporalSession) => Promise<any>

export interface ErrorHandler {
    type: Function;
    function: ErrorMatcher[],
    null: ErrorMatcher[],
    regexp: ErrorMatcher[],
    string: ErrorMatcher[]
}

export interface ErrorMatcher {
    codeMatch?: Codematch;
    handler?: Handler;
}
