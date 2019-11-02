import { CommanderStatic, CommandOptions, Command } from 'commander'

export type CommanderFunction = {
  (nameAndArgs: string, opts?: CommandOptions): Command;
  (nameAndArgs: string, description: string, opts?: CommandOptions): Command;
}
