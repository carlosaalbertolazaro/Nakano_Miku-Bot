import 'dotenv/config'
import http from 'http'
import * as baileysMod from '@whiskeysockets/baileys'
import pino from 'pino'
import fs from 'fs'
import { readdir, stat, unlink } from 'fs/promises'
import readline from 'readline'
import chalk from 'chalk'
import config from './config.js'
import { handler, loadPlugins, setupWatchers } from './handler.js'
import { msgRetryCache } from './lib/caches.js'
import { startEventScheduler } from './lib/eventScheduler.js'
import { startAiringScheduler } from './lib/animeAiringScheduler.js'
import { startAternosScheduler } from './lib/aternosScheduler.js'
import { setWatchdogHandler } from './lib/queue.js'
import { SESSION_PATH } from './lib/storagePaths.js'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } = pkg

const TMP_PATH = './tmp'

if (!fs.existsSync(SESSION_PATH)) fs.mkdirSync(SESSION_PATH, { recursive: true })
if (!fs.existsSync(TMP_PATH)) fs.mkdirSync(TMP_PATH, { recursive: true })
console.log(chalk.bold.cyan(`[ALMACENAMIENTO] Sesión de WhatsApp: ${SESSION_PATH}`))

setInterval(async () => {
  if (!fs.existsSync(TMP_PATH)) return
  try {
    const files = await readdir(TMP_PATH)
    for (const f of files) {
      const fp = `${TMP_PATH}/${f}`
      try {
        const s = await stat(fp)
        if (Date.now() - s.mtimeMs > 3_600_000) await unlink(fp)
      } catch {}
    }
  } catch {}
}, 3_600_000)

process.on('unhandledRejection', (reason) => {
  console.error(chalk.bold.red('[UNHANDLED REJECTION]'), reason?.stack || reason)
})
process.on('uncaughtException', (err) => {
  console.error(chalk.bold.red('[UNCAUGHT EXCEPTION]'), err?.stack || err)
})

// Servidor HTTP simple para responder a health checks de Railway / Render / Koyeb
const PORT = process.env.PORT || 3000
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    status: 'ok',
    bot: config.botName,
    uptime: Math.floor(process.uptime()),
  }))
})
server.listen(PORT, '0.0.0.0', () => {
  console.log(chalk.bold.cyan(`[HTTP] Servidor de salud activo en puerto ${PORT}`))
}).on('error', (e) => {
  console.log(chalk.yellow(`[HTTP] Servidor no pudo escuchar en ${PORT}: ${e.message}`))
})

let retryCount = 0
function calcDelay() {
  return Math.min(5000 * 2 ** retryCount + Math.random() * 2000, 120_000)
}

async function getPairingNumber() {
  let num = process.env.WHATSAPP_NUMBER?.replace(/\D/g, '')

  // Si no se definió en env, revisar si se configuró un número válido en config.ownerNumber
  if (!num) {
    const owners = Array.isArray(config.ownerNumber) ? config.ownerNumber : [config.ownerNumber]
    const validOwner = owners.find(o => o && !String(o).includes('X'))
    if (validOwner) {
      num = String(validOwner).replace(/\D/g, '')
      console.log(chalk.bold.yellow(`[VINCULACIÓN] Usando número configurado en config.js: ${num}`))
    }
  }

  // Railway no permite responder preguntas interactivas desde sus logs.
  if (!num && !process.stdin.isTTY) {
    throw new Error('No hay una sesión vinculada. Configurá WHATSAPP_NUMBER (sin +) en las variables del servicio y redesplegá.')
  }

  if (!num) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    num = await new Promise(res =>
      rl.question(chalk.bold.yellowBright('\nINGRESA TU NÚMERO DE TELÉFONO (con código de país, sin +): '), ans => {
        rl.close()
        res(ans.replace(/\D/g, ''))
      })
    )
  }

  if (!num) throw new Error('El número de WhatsApp no puede estar vacío.')

  // Normalizaciones críticas para México y formatos comunes:
  // 1. Si pusieron 10 dígitos (número mexicano local sin código de país 52, ej. 2285117201)
  if (num.length === 10) {
    num = '52' + num
    console.log(chalk.bold.cyan(`[VINCULACIÓN] Se agregaron dígitos de país (+52 México) al número -> ${num}`))
  }
  // 2. Si pusieron 13 dígitos con el '1' móvil de México (521XXXXXXXXXX -> 52XXXXXXXXXX)
  // Baileys requiere exactamente 52 + 10 dígitos (12 dígitos) para que WhatsApp valide el código de emparejamiento
  if (num.startsWith('521') && num.length === 13) {
    num = '52' + num.slice(3)
    console.log(chalk.bold.cyan(`[VINCULACIÓN] Normalizado formato móvil de México (521 -> 52) -> ${num}`))
  }

  return num
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH)
  const hadRegisteredSession = Boolean(state.creds.registered)
  const { version } = await fetchLatestBaileysVersion()
  const logger = pino({ level: 'silent' })

  const conn = makeWASocket({
    version,
    logger,
    printQRInTerminal: !config.usePairingCode,
    browser: Browsers.ubuntu('Chrome'),
    keepAliveIntervalMs: 30000,
    connectTimeoutMs: 60000,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    forceSyncHistoryMessage: false,
    shouldSyncHistoryMessage: () => false,
    getMessage: async (key) => {
      const msg = msgRetryCache.get(key.id)
      return msg || undefined
    }
  })
setWatchdogHandler(() => {
    console.log(chalk.bold.yellow('[WATCHDOG] Forzando cierre del socket para reconectar...'))
    conn.end(new Error('watchdog: reconexión forzada por timeouts repetidos'))
  })

  let pairingRequested = false
  if (config.usePairingCode && !conn.authState.creds.registered) {
    const numero = await getPairingNumber()
    setTimeout(async () => {
      if (pairingRequested || conn.authState.creds.registered) return
      pairingRequested = true
      try {
        console.log(chalk.bold.cyan(`[VINCULACIÓN] Solicitando código para: +${numero}...`))
        const raw = await conn.requestPairingCode(numero)
        const code = raw?.match(/.{1,4}/g)?.join('-') ?? raw
        console.log(`\n${chalk.bold.yellowBright('╔═════════════════════════════════════════╗')}`)
        console.log(`${chalk.bold.yellowBright('║         CÓDIGO DE VINCULACIÓN           ║')}`)
        console.log(`${chalk.bold.yellowBright('╚═════════════════════════════════════════╝')}`)
        console.log(`\n  ${chalk.bold.bgGreen.white(`   ${code}   `)}\n`)
        console.log(chalk.bold.greenBright(`👉 Ingresá este código en WhatsApp:`))
        console.log(chalk.bold.white(`   Dispositivos vinculados > Vincular con número de teléfono (+${numero})\n`))
      } catch (e) {
        console.error(chalk.bold.red('Error al solicitar código:'), e.message)
      }
    }, 4000)
  }

  conn.ev.on('creds.update', saveCreds)

  conn.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = code !== DisconnectReason.loggedOut

      console.log(chalk.bold.red(`\n[CONEXIÓN] Cerrada. Código: ${code}. Reconectar: ${shouldReconnect}`))

      if (shouldReconnect) {
        const delay = calcDelay()
        retryCount++
        console.log(chalk.bold.yellow(`[CONEXIÓN] Reintentando en ${Math.round(delay / 1000)}s...`))
        setTimeout(startBot, delay)
      } else if (hadRegisteredSession || conn.authState?.creds?.registered) {
        // Un 401 puede aparecer durante un redespliegue o si dos instancias
        // compiten por las mismas credenciales. Borrar acá convertía cualquier
        // fallo en una vinculación obligatoria nueva. Una sesión registrada
        // solo se elimina manualmente cuando el usuario realmente la desvinculó.
        console.log(chalk.bold.red('[CONEXIÓN] WhatsApp rechazó la sesión registrada (401). Los archivos se conservan; no se borrarán automáticamente.'))
        console.log(chalk.bold.yellow('[CONEXIÓN] Verificá que haya una sola réplica usando esta sesión. Si la desvinculaste en WhatsApp, seguí la recuperación manual de DEPLOY_RAILWAY.md.'))
        process.exit(1)
      } else {
        // Durante el primer emparejamiento todavía no hay una sesión válida que
        // preservar. Solo en ese caso se limpia el intento incompleto y se reintenta.
        console.log(chalk.bold.yellow('[CONEXIÓN] El emparejamiento no llegó a registrarse. Limpiando únicamente ese intento incompleto...'))
        try {
          fs.rmSync(SESSION_PATH, { recursive: true, force: true })
          fs.mkdirSync(SESSION_PATH, { recursive: true })
          console.log(chalk.bold.green('[CONEXIÓN] Intento de emparejamiento limpiado correctamente.'))
        } catch (e) {
          console.error('[CONEXIÓN] Error al limpiar el intento de emparejamiento:', e.message)
        }
        console.log(chalk.bold.yellow('[CONEXIÓN] Reintentando vinculación limpia en 5 segundos...'))
        setTimeout(startBot, 5000)
      }
    } else if (connection === 'open') {
      retryCount = 0
      const botNum = conn.user?.id?.split('@')[0]?.split(':')[0]
      console.log(chalk.bold.greenBright(`\n╔══════════════════════════════╗`))
      console.log(chalk.bold.greenBright(`║  ✅  BOT CONECTADO           ║`))
      console.log(chalk.bold.greenBright(`╚══════════════════════════════╝`))
      console.log(chalk.bold.cyanBright(`  🤖 Nombre   : ${config.botName}`))
      console.log(chalk.bold.cyanBright(`  📱 Número   : +${botNum}`))
      console.log(chalk.bold.cyanBright(`  🔖 Versión  : ${config.version}\n`))
      conn.botname = config.botName

      await loadPlugins()
      setupWatchers(conn)
      startEventScheduler(conn)
      startAiringScheduler(conn)
      startAternosScheduler(conn)
    }
  })

  conn.ev.on('group-participants.update', async (data) => {
    try {
      const { manejarParticipantes } = await import('./plugins/welcome.js')
      await manejarParticipantes(conn, data)
    } catch (e) {
      console.error(chalk.bold.bgRed.white(' [WELCOME EVENT ERROR] '), chalk.bold.redBright(e.stack || e.message))
    }
    try {
      const { manejarVerificacion } = await import('./plugins/P-GRUPOS/grupo-verify.js')
      await manejarVerificacion(conn, data)
    } catch (e) {
      console.error(chalk.bold.bgRed.white(' [VERIFY EVENT ERROR] '), chalk.bold.redBright(e.stack || e.message))
    }
  })

  conn.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    // Antes se hacía `await handler(...)` en el loop, uno por uno — si UN
    // mensaje se colgaba en algo (una descarga externa lenta, un socket
    // raro), el resto de los mensajes (de cualquier chat, de cualquier
    // persona) quedaba esperando detrás sin procesarse, y el bot parecía
    // mudo del todo hasta que esa promesa colgada se resolviera. Ahora cada
    // mensaje se procesa independiente (sin await acá), así uno colgado no
    // frena a los demás.
    for (const msg of messages) {
      handler(conn, msg).catch(e => {
        console.error(chalk.bold.bgRed.white(' [HANDLER ERROR] '), chalk.bold.redBright(e.stack || e.message))
      })
    }
  })
}

startBot()
