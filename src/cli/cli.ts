import { CommanderStatic } from 'commander'
import * as pj from '../../package.json'
import { registerCommands } from './commands'

/**
 * initializes the CLI program
 * 
 * @param program - the cli program
 */
export const cli = (program: CommanderStatic) => {
  program.version(pj.version)
  registerCommands(program)
  program.parse(process.argv)
}