import { AxiosInstance } from 'axios'

type FetchUrl = (value?: any) => string
export type FetchFunction = {
  (value?: string): Promise<any>
  entity: string
  cache: {
      [link: string]: any;
  }
}

/**
 * A factory that generates fetch functions
 */
export class FetchFactory {

  /**
   * generates a fetch action function
   * 
   * @param entity - entity type
   * @param client - axios client
   * @param url - url
   */
  static generateFetchAction(entity: string, client: AxiosInstance, url: FetchUrl | string): FetchFunction {
    const cache: FetchFunction['cache'] = []

    const func = async (value?: string) => {
      const link = typeof url === 'string' ? url : url(value)
      if (cache[link]) return value;
      const { data } = await client.get(link);
      cache[link] = data
      return data
    }
    func.entity = entity
    func.cache = cache
    return func
  }
}
