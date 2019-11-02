import * as fs from 'fs-extra';
import * as path from 'path';
import axios, { AxiosInstance } from 'axios';

import { ScraperModule } from "@types";
import { FetchFactory, FetchFunction, Logger, BatchProcessor } from "@util";

const baseURL = 'https://universe-meeps.leagueoflegends.com/v1';

/**
 * A module for scraping the LoL Universe website
 */
export class UniverseModule extends ScraperModule {
  protected client: AxiosInstance;
  protected actions: {
    [type: string]: FetchFunction
  } = {}

  constructor() {
    super()
    this.client = axios.create({ baseURL: `${baseURL}/en_us` });

    this.actions.initial = FetchFactory.generateFetchAction(
      'initial data', this.client, '/search/index.json');

    this.actions.story = FetchFactory.generateFetchAction(
      'stories', this.client, item => `/story/${item}/index.json`);

    this.actions.champion = FetchFactory.generateFetchAction(
      'champions', this.client, item => `/champions/${item}/index.json`);

    this.actions.faction = FetchFactory.generateFetchAction(
      'factions', this.client, item => `/factions/${item}/index.json`)
  }

  /**
   * scrapes the initial values
   */
  private async scrapeInitial(): Promise<{ championsSummary: any[], factionsSummary: any[] }> {
    const { 
      champions: championsSummary, 
      factions: factionsSummary,
    } = await this.fetchSingle(this.actions.initial)
    return { championsSummary, factionsSummary }
  }

  /**
   * scrapes the factions
   */
  private async scrapeFactions(factionsSummary: any[]): Promise<any> {
    const slugs: string[] = factionsSummary.map(({ slug }) => slug);
    return this.fetchBatch(this.actions.faction, slugs);
  }

  private async scrapeFactionImages(factions: any[]): Promise<void> {
    const batch = new BatchProcessor('faction images', url => this.scrapeAsset(url))
    const images = factions.map(faction => {
      const items: any[] = []
      items.push(faction.faction.image.uri)
      items.push(faction.faction.video.uri)
      items.push(faction.modules.map(mod => {
        switch (mod.type) {
          case 'featured-video':
            return [mod['featured-image'].uri, mod.video.uri]
          case 'image-gallery':
            return mod.assets.map(asset => asset.uri)
          default:
            return []
        }
      }).flat(Infinity))
      return items;
    }).flat(Infinity)

    batch.add(...images)
    await batch.process()
  }

  /**
   * scrapes the champions
   */
  private async scrapeChampions(championsSummary: any[]): Promise<any> {
    const slugs: string[] = championsSummary.map(({ slug }) => slug);
    return this.fetchBatch(this.actions.champion, slugs);
  }

  /**
   * scrapes the stories
   */
  private async scrapeStories(champions: any[], factions: any[]): Promise<any> {
    const slugs: string[] = [...new Set([...factions, ...champions]
      .flatMap(({ modules }) => modules)
      .filter(({ type }) => type == 'story-preview')
      .map(({ 'story-slug': slug }) => slug))
    ]
    return this.fetchBatch(this.actions.story, slugs);
  }

  async scrape() {
    const { championsSummary, factionsSummary } = await this.scrapeInitial()

    const factions = await this.scrapeFactions(factionsSummary)
    // const champions = await this.scrapeChampions(championsSummary)
    // const stories = await this.scrapeStories(champions, factions)
    
    await this.scrapeFactionImages(factions)

    await fs.outputJSON(
      path.join(process.cwd(), `data/raw.json`),
      { factions },
      // { factions, champions, stories }, 
      { spaces: 2 }
    )
  }
}