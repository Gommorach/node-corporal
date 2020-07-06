export interface CommandContext {
    commands: string[];
}

export type CommandContexts = {[contextName: string]: CommandContext};

