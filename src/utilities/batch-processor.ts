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

  constructor(entity: string, func: BatchFunction, size = 5) {
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
    const current: any = { current: null }
    const bar = Logger.createProgressBar(LogType.FETCH, `fetching ${this.entity}`, current)
    bar.start(this.list.length)
    
    const returnList: any[] = await new Promise((resolve) => {
      const list = [...this.list]
      const data: any[] = []

      let i = -1;
      const exec = async (item, list) => {
        i++;
        await data.push(await this.func(item, i));
        current.current = `currently fetched '${this.list[i]}'`
        bar.increment()

        if (data.length == this.list.length) {
          resolve(data)
        } else if (list.length > 0) {
          const newItem = list.shift()
          exec(newItem, list)
        }

      }
      list.splice(0, this.size).forEach(item => exec(item, list))
    })

    bar.stop()
    Logger.logComplete(`fetched ${this.entity}`)

    return returnList
  }
}