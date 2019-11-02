import { CommanderStatic } from 'commander'
import { scrape } from './scrape'

/**
 * registers all commands
 * 
 * @param program - the cli program
 */
export const registerCommands = (program: CommanderStatic) => {
  scrape(program)
}
