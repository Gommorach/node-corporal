import CorporalSession from "../lib/session";
import { Command } from '../types/command';

export default {
    description: 'Clear the terminal window.',
    invoke: async (session: CorporalSession) => session.stdout().write('\u001B[2J\u001B[0;0f')
} as Command;
