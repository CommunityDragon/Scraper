import * as fs from 'fs-extra';
import * as path from 'path';
import axios, { AxiosInstance } from 'axios';

import { ScraperModule } from "@types";
import { FetchFactory, FetchFunction, BatchProcessor } from "@util";

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

  /**
   * scrapes faction assets
   * 
   * @param factions - factions data
   */
  private async scrapeFactionAssets(factions: any[]): Promise<void> {
    const batch = new BatchProcessor('faction assets', url => this.scrapeAsset(url))
    const assets: any[] = []
    factions.forEach(faction => {
      assets.push(faction.faction.image.uri);
      assets.push(faction.faction.video.uri);
      faction.modules.forEach(mod => 
        assets.push(...this.getModuleAssetLinks(mod))
      );
    })
    batch.add(...assets)
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
   * scrapes the champion assets
   * 
   * @param champions - champions data
   */
  private async scrapeChampionAssets(champions: any[]): Promise<void> {
    const batch = new BatchProcessor('champion assets', url => this.scrapeAsset(url))
    const assets: any[] = []
    champions.forEach(champion => {
      assets.push(champion.champion.image.uri);
      if (champion.champion.video) {
        assets.push(champion.champion.video.uri)
      }
      champion.modules.forEach(mod => 
        assets.push(...this.getModuleAssetLinks(mod))
      );
    })

    batch.add(...assets)
    await batch.process()
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

  /**
   * scrapes the story assets
   * 
   * @param stories - stories data
   */
  private async scrapeStoryAssets(stories: any[]): Promise<void> {
    const batch = new BatchProcessor('champion assets', url => this.scrapeAsset(url))
    const assets: any[] = []
    stories.forEach(story => {
      story.story['story-sections'].map(section => {
        if (section['background-image']) {
          assets.push(section['background-image'].uri)
        }
        section['story-subsections'].forEach(subSection => {
          if (subSection['icon-image']) {
            assets.push(subSection['icon-image'].uri)
          }
        })
      })
    })
    batch.add(...assets)
    await batch.process()
  }

  async scrape() {
    const { championsSummary, factionsSummary } = await this.scrapeInitial()

    const factions = await this.scrapeFactions(factionsSummary)
    const champions = await this.scrapeChampions(championsSummary)
    const stories = await this.scrapeStories(champions, factions)
    
    await this.scrapeFactionAssets(factions)
    await this.scrapeChampionAssets(champions)
    await this.scrapeStoryAssets(stories)


    await fs.outputJSON(
      path.join(process.cwd(), `data/raw.json`),
      // { champions },
      // { factions },
      // { stories },
      { factions, champions, stories }, 
      { spaces: 2 }
    )
  }
}