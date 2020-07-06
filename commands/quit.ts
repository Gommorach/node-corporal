import CorporalSession from "../lib/session";
import {Command} from "../types/command";

export default {
    description: 'Quit the interactive shell.',
    invoke: async (session: CorporalSession) => session.quit = true
} as Command;
