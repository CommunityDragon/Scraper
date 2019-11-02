import { AxiosInstance } from "axios";
import { FetchFunction, Logger, BatchProcessor } from "@util";
import puppeteer, { Browser } from 'puppeteer';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs-extra';
import * as path from 'path';
import ytdl from 'ytdl-core';
import crypto from 'crypto';

/**
 * A scraper module
 */
export abstract class ScraperModule {
  private browser: Browser | null = null
  protected abstract client: AxiosInstance
  protected imageMap: {
    [type: string]: string
  } = {}

  /**
   * scrapes an asset and saves it
   * 
   * @param url - asset url
   */
  protected async scrapeAsset(url: string): Promise<void> {
    if (this.imageMap[url]) return;
    this.imageMap[url] = this.getHash(url)
    await fs.ensureDir(this.getAssetPath());

    switch (true) {
      case url.includes('youtu.be'):
      case url.includes('youtube.com'):
        await this.scrapeYoutubeVideo(url)
        break;
      default:
        await this.scrapeNormalAsset(url)
        break;
    }
  }

  protected getModuleAssetLinks(mod: any): string[] {
    switch (mod.type) {
      case 'featured-video':
        return [mod['featured-image'].uri, mod.video.uri]
      case 'image-gallery':
      case 'image-scroller':
        return mod.assets.map(asset => asset.uri)
      default:
        return []
    }
  }

  /**
   * scrapes asset in a regular fashion
   * 
   * @param url - asset url
   */
  private async scrapeNormalAsset(url: string): Promise<void> {
    const ext = (url.split('.').pop() as string).toLowerCase();
    const { data } = await this.client({
      responseType: 'stream',
      method: 'get',
      url,
    })
    const hash = this.getHash(url)
    const filePath = path.join(this.getAssetPath(), `${hash}.${ext}`);
    await this.saveFile(data, filePath);
  }

  /**
   * scrapes a youtube video
   * 
   * @param url - youtube url
   */
  private async scrapeYoutubeVideo(url: string): Promise<void> {
    const hash = this.getHash(url)
    const videoPath = path.join(this.getAssetPath(), `${hash}.webm`);
    const audioPath = path.join(this.getAssetPath(), `${hash}.audio.webm`);

    return new Promise((resolve, reject) => {
      ytdl(url, {
        filter: format => format.container === 'webm' && !format.encoding
      }).pipe(fs.createWriteStream(audioPath))
        .on('error', reject)
        .on('finish', () => {
          ffmpeg()
            .input(ytdl(url, { filter: format => {
              return format.container === 'webm' && !format.audioEncoding; } }))
            .videoCodec('copy')
            .input(audioPath)
            .audioCodec('copy')
            .save(videoPath)
            .on('error', reject)
            .on('end', async () => {
              fs.unlink(audioPath, err => {
                if(err) reject(err);
                else resolve()
              });
            });
        });
    })
  }

  /**
   * gets hash value of string
   * 
   * @param val - value
   */
  private getHash(val: string): string {
    return crypto.createHash('sha1').update(val).digest('hex');
  }

  /**
   * Loads a scraping browser
   */
  protected async loadBrowser() {
    if (this.browser) return
    Logger.logProcess('loading virtual browser...')
    this.browser = await puppeteer.launch()
    Logger.clearLine()
    Logger.logComplete('virtual browser loaded')
  }

  /**
   * gets the asset path
   */
  private getAssetPath(): string {
    return path.join(process.cwd(), 'data/images')
  }

  /**
   * saves a file
   * 
   * @param pipeable - pipeable object
   * @param filePath - path
   */
  private async saveFile(pipeable: any, filePath: string): Promise<void> {
    const fileStream = fs.createWriteStream(filePath);
    await new Promise((resolve, reject) => {
      pipeable.pipe(fileStream);
      pipeable.on("error", (err) => {
        reject(err);
      });
      fileStream.on("finish", () => {
        resolve();
      });
    });
  }


  /**
   * fetches a single item
   * 
   * @param func - fetch function
   * @param value - value
   */
  protected async fetchSingle(func: FetchFunction, value?: string): Promise<any> {
    Logger.logFetch(`fetching ${func.entity}${value ? ` ${value}` : ''}...`)
    const data = await func(value)
    Logger.clearLine()
    Logger.logComplete(`fetched ${func.entity}${value ? ` ${value}` : ''}`)
    return data
  }

  /**
   * fetches a single item
   * 
   * @param func - fetch function
   * @param value - value
   */
  protected async fetchBatch(func: FetchFunction, values: string[]): Promise<any> {
    const batch = new BatchProcessor<any>(func.entity, (val: any) => func(val))
    batch.add(...values)
    return await batch.process()
  }

  /**
   * scrapes the module
   */
  abstract async scrape(): Promise<void>
}
