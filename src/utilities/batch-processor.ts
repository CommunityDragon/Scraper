import { Logger, LogType } from "@util"

type BatchFunction = (current: any, iteration?: number) => Promise<any>

/**
 * Processes a list of items in batches
 */
export class BatchProcessor<T = any, RT = any> {
  private entity: string
  private func: BatchFunction
  private size: number
  private list: T[]

  constructor(entity: string, func: BatchFunction, size = 100) {
    this.entity = entity
    this.func = func
    this.size = size
    this.list = []
  }

  /**
   * Adds one or multiple items to the batch
   */
  public async add(...items: T[]) {
    this.list.push(...items)
  }

  /**
   * Processes the batch
   */
  public async process(): Promise<RT[]> {
    let batch: Promise<RT>[] = []
    let returnList: RT[] = []
    const current: any = { current: null }

    const bar = Logger.createProgressBar(LogType.FETCH, `fetching ${this.entity}`, current)
    bar.start(this.list.length)

    for (let i = 0; i < this.list.length; i++) {
      batch.push((async () => {
        const data = await this.func(this.list[i], i)
        current.current = `currently fetched '${this.list[i]}'`
        bar.increment()
        return data
      })())

      if (batch.length === this.size) {
        returnList.push(...await Promise.all(batch))
        batch = []
      }
    }
    if (batch.length > 0) {
      returnList.push(...await Promise.all(batch))
    }

    bar.stop()
    Logger.logComplete(`fetched ${this.entity}`)

    return returnList
  }
}