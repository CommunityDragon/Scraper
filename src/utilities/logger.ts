import progress from 'cli-progress'
import chalk from 'chalk'

export const enum LogType {
  COMPLETE = 'COMPLETE',
  PROCESS = 'PROCESS',
  FETCH = 'FETCH',
  ERROR = 'ERROR',
  INFO = 'INFO'
}

const LogTypeData = {
  [LogType.PROCESS]: {
    value: 'process',
    color: '#FFAA28',
  },
  [LogType.COMPLETE]: {
    value: 'complete',
    color: 'greenBright',
  },
  [LogType.FETCH]: {
    value: 'fetching',
    color: 'blueBright',
  },
  [LogType.INFO]: {
    value: 'info',
    color: 'magenta',
  },
  [LogType.ERROR]: {
    value: 'error',
    color: 'red',
  },
}

export class Logger {
  /**
   * gets the prepend to the log
   * 
   * @param type - log type
   */
  private static getPrepend(type: LogType): string {
    if (chalk[LogTypeData[type].color]) {
      return `[ ${chalk[LogTypeData[type].color](LogTypeData[type].value)} ]`
    } else {
      return `[ ${chalk.hex(LogTypeData[type].color)(LogTypeData[type].value)} ]`
    }
  }

  /**
   * logs a message
   * 
   * @param type - log type
   * @param message - message
   */
  public static log(type: LogType, message: string) {
    process.stdout.write(`${this.getPrepend(type)} ${message}\n`)
  }
  

  /**
   * clears the line
   */
  public static clearLine() {
    process.stdout.moveCursor(0, -1)
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
  }

  /**
   * logs a fetch message
   * 
   * @param message - message
   */
  public static logFetch(message: string) {
    this.log(LogType.FETCH, message)
  }

  /**
   * logs a complete message
   * 
   * @param message - message
   */
  public static logComplete(message: string) {
    this.log(LogType.COMPLETE, message)
  }

  /**
   * logs a process message
   * 
   * @param message - message
   */
  public static logProcess(message: string) {
    this.log(LogType.PROCESS, message)
  }

  /**
   * logs an info message
   * 
   * @param message - message
   */
  public static logInfo(message: string) {
    this.log(LogType.INFO, message)
  }

  /**
   * logs an error message
   * 
   * @param message - message
   */
  public static logError(message: string) {
    this.log(LogType.ERROR, message)
  }

  /**
   * creates a progress bar
   * 
   * @param type - log type
   * @param message - message before the bar
   */
  public static createProgressBar(type: LogType, message: string, current?: { current: string }) {
    const pre = this.getPrepend(type)
    const curObj = current

    const bar = new progress.SingleBar({
      clearOnComplete: true,
      format(options, params) {
        const pcn =  `${Math.round(params.progress*100)}%`
        const count = `(${params.value}/${params.total})`
        const cur = (curObj && curObj.current) ? ` | ${curObj.current}` : ''
        const bar = chalk[LogTypeData[type].color](
          options.barCompleteString.substr(0, Math.round(params.progress * options.barsize)) +
            options.barIncompleteString.substr(0, Math.round((1.0 - params.progress) * options.barsize))
        )
        return `${pre} ${message} ${bar} ${pcn} ${count}${cur}`
    }
    }, progress.Presets.shades_classic);
    
    return bar
  }
}
