import { CommanderStatic } from 'commander'
import { Modules, Locales, ScraperModule } from '@types'
import { UniverseModule } from '@mod'
import { Logger } from '@util'

const locales = Object.keys(Locales).map(key => Locales[key])
const mods = Object.keys(Modules).map(key => Modules[key])

const scrapers: {
  [key: string]: ScraperModule
} = {
  [Modules.UNIVERSE]: new UniverseModule(),
}

/**
 * initializes the scrape command
 * 
 * @param program - the cli program
 */
export const scrape = (program: CommanderStatic) => {
  program.command('scrape <mod>')
    .description('scrapes one or multiple modules from League of Legends', {
      'mod': (() =>
        'a source of data, options are:'
          + mods.reduce((acc, cur) => acc + `\n  - ${cur}`, '')
      )()
    })
    .option('--locales [locales]', (() => 
      'a list of locales that are comma seperated to scrape (default=all), options are:\n'
        + locales.reduce((acc, cur) => {
          if (acc[acc.length - 1].length === 10) acc.push([]);
          acc[acc.length - 1].push(`${cur}`);
          return acc;
        }, [[]]).map(item => item.join(', ')).join('\n')
    )())
    .action(async (mod, opts) => {
      if (!mods.some(val => val === mod)) {
        console.error(`${mod} is not a valid module`)
        process.exit(1)
      }

      let locs: string[] | null = opts.locales 
        ? opts.locales.toLowerCase().split(',')
        : ['all']

      if (locs!.some(loc => loc != 'all' && !locales.some(locale => locale == loc))) {
        console.error(`one or multiple locales given are invalid`)
        process.exit(1)
      }
      if (locs!.some(loc => loc === 'all')) locs = null;
      
      if (mod === 'all') {
        Logger.logInfo('all modules selected for scraping')
        const scrapeKeys = Object.keys(scrapers);
        for (let i = 0; i < scrapeKeys.length; i++) {
          const key = scrapeKeys[i]
          Logger.logInfo(`started scraping module: ${key}`)
          await scrapers[key].scrape()
          Logger.logInfo(`done scraping module: ${key}`)
        }
      } else {
        Logger.logInfo(`module ${mod} selected for scraping`)
        await scrapers[mod].scrape()
        Logger.logInfo(`done scraping module: ${mod}`)
      }
      Logger.logInfo('scraping has finished')
    })
}
