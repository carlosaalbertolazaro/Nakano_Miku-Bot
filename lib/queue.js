import chalk from 'chalk'

class MessageQueue {
  constructor(chatId) {
    this.chatId       = chatId
    this.queue        = []
    this.isProcessing = false
    this.lastUsed     = Date.now()
  }

  async add(task) {
    this.lastUsed = Date.now()
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try { resolve(await task()) } catch (e) { reject(e) }
      })
      this.process()
    })
  }

  async process() {
    if (this.isProcessing) return
    this.isProcessing = true

    while (this.queue.length > 0) {
      const task = this.queue.shift()
      try {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 60000))
        await Promise.race([task(), timeout])
      } catch (e) {
        console.error(chalk.bold.redBright(`[QUEUE:${this.chatId}]`), e.message)      
if (e.message === 'Timeout') reportTimeout()
}

      await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1000) + 500))
    }

    this.isProcessing = false
  }
}

let watchdogHandler = null
let recentTimeouts = []
const WATCHDOG_WINDOW_MS = 60_000
const WATCHDOG_THRESHOLD = 3
let watchdogCooldownUntil = 0

export function setWatchdogHandler(fn) {
  watchdogHandler = fn
}

function reportTimeout() {
  const now = Date.now()
  recentTimeouts.push(now)
  recentTimeouts = recentTimeouts.filter(t => now - t < WATCHDOG_WINDOW_MS)
  if (recentTimeouts.length >= WATCHDOG_THRESHOLD && now > watchdogCooldownUntil && watchdogHandler) {
    watchdogCooldownUntil = now + WATCHDOG_WINDOW_MS
    recentTimeouts = []
    console.error(chalk.bold.bgRed.white(' [WATCHDOG] '), chalk.bold.redBright(`${WATCHDOG_THRESHOLD} timeouts de envío en menos de ${WATCHDOG_WINDOW_MS / 1000}s — forzando reconexión.`))
    watchdogHandler()
  }
}

export const chatQueues = new Map()

export function getChatQueue(chatId) {
  if (!chatQueues.has(chatId)) chatQueues.set(chatId, new MessageQueue(chatId))
  return chatQueues.get(chatId)
}

const IDLE_TTL = 3_600_000

setInterval(() => {
  const ahora = Date.now()
  for (const [chatId, q] of chatQueues.entries()) {
    if (q.queue.length === 0 && !q.isProcessing && ahora - q.lastUsed > IDLE_TTL) {
      chatQueues.delete(chatId)
    }
  }
}, IDLE_TTL)
