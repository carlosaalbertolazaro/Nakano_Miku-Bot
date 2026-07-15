import UserDb from '../../lib/database/UserDb.js'
import { grantXp } from '../../lib/economy.js'

// Torneo relámpago de eliminación simple. Un solo torneo activo por grupo a
// la vez (Map en memoria, mismo patrón self-contained que fun-ttt.js /
// fun-akinator.js). Nota de diseño: el bracket se muestra como texto
// formateado, no como imagen — Jimp no tiene primitivas confiables de dibujo
// de líneas para armar un bracket gráfico sin poder probarlo en vivo, así que
// se optó por texto (igual de legible en WhatsApp, y coherente con el resto
// del bot que ya usa mucho box-drawing).
//
// Todo se maneja con SUBCOMANDOS DE TEXTO (.torneo unirse / .torneo ganador
// a|b), no con botones nativos de WhatsApp — dejaron de ser confiables para
// números no verificados como negocio.
const sessions = new Map() // chatId -> session

const REG_TIMEOUT_MS = 3 * 60 * 1000
const REPORT_TIMEOUT_MS = 5 * 60 * 1000
const MAX_PLAYERS = 16
const CHAMPION_PRIZE = 300
const RUNNERUP_PRIZE = 100

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function nextPowerOfTwo(n) {
  let p = 1
  while (p < n) p *= 2
  return p
}

function buildRoundMatches(players) {
  const matches = []
  for (let i = 0; i < players.length; i += 2) {
    matches.push({ a: players[i] || null, b: players[i + 1] || null, winner: null })
  }
  return matches
}

// Si un partido quedó con un solo jugador real (el otro lado es BYE, null,
// por el padding a potencia de 2), ese jugador avanza automático sin reportar.
function autoResolveByes(session) {
  for (const match of session.matches) {
    if (match.winner) continue
    if (match.a && !match.b) match.winner = match.a
    else if (!match.a && match.b) match.winner = match.b
  }
}

function allMatchesResolved(session) {
  return session.matches.every(mt => mt.winner)
}

function clearTimer(session) {
  if (session.timer) { clearTimeout(session.timer); session.timer = null }
}

function endSession(chat) {
  const session = sessions.get(chat)
  if (session) clearTimer(session)
  sessions.delete(chat)
}

function canManage(session, m, ctx) {
  return m.sender === session.organizer || ctx.isAdmin || ctx.isOwner
}

async function announceRegistration(conn, m, session) {
  const lista = session.players.length
    ? session.players.map((p, i) => `> ${i + 1}. @${p.split('@')[0]}`).join('\n')
    : '> _Nadie se anotó todavía._'

  await conn.sendMessage(m.chat, {
    text: `*┏━━•❈ 🏆 TORNEO RELÁMPAGO ❈•━━┓*\n\n` +
      `> Organiza: @${session.organizer.split('@')[0]}\n` +
      `> Cupo: ${session.players.length}/${MAX_PLAYERS}\n\n` +
      `*『 📋 Anotados 』*\n${lista}\n\n` +
      `> ✍️ Escribí *.torneo unirse* para anotarte.\n` +
      `> ▶️ El organizador (o un admin) inicia con *.torneo iniciar* cuando estén todos (mínimo 2).\n` +
      `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`,
    mentions: session.players,
  }, { quoted: m })
}

async function announceMatch(conn, m, session) {
  const match = session.matches[session.currentMatchIndex]
  const nombreA = `@${match.a.split('@')[0]}`
  const nombreB = `@${match.b.split('@')[0]}`

  await conn.sendMessage(m.chat, {
    text: `*┏━━•❈ 🏆 RONDA ${session.round} ❈•━━┓*\n\n` +
      `> *Partido ${session.currentMatchIndex + 1}/${session.matches.length}*\n\n` +
      `> 🅰️ ${nombreA}\n> 🆚\n> 🅱️ ${nombreB}\n\n` +
      `> El organizador o un admin reporta con:\n` +
      `> *.torneo ganador a* → gana ${nombreA}\n` +
      `> *.torneo ganador b* → gana ${nombreB}\n` +
      `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`,
    mentions: [match.a, match.b],
  }, { quoted: m })
}

async function announceChampion(conn, m, championJid, runnerUpJid) {
  const championUser = await UserDb.findOrCreate(championJid)
  championUser.coins += CHAMPION_PRIZE
  const xpResult = grantXp(championUser, 200)
  await championUser.save()

  if (runnerUpJid) {
    const runnerUp = await UserDb.findOrCreate(runnerUpJid)
    runnerUp.coins += RUNNERUP_PRIZE
    await runnerUp.save()
  }

  let txt = `*┏━━•❈ 🎉 ¡TENEMOS CAMPEÓN! ❈•━━┓*\n\n` +
    `> 🏆 @${championJid.split('@')[0]} ganó el torneo\n` +
    `> 💰 Premio: ${CHAMPION_PRIZE} monedas + 200 XP\n` +
    (runnerUpJid ? `> 🥈 @${runnerUpJid.split('@')[0]} — subcampeón (${RUNNERUP_PRIZE} monedas)\n` : '') +
    (xpResult.leveledUp ? `> 🎉 ¡El campeón subió a nivel ${xpResult.newLevel}!\n` : '') +
    `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  const mentions = [championJid, ...(runnerUpJid ? [runnerUpJid] : [])]
  await conn.sendMessage(m.chat, { text: txt, mentions }, { quoted: m })
}

function timeoutMatch(conn, chat) {
  const session = sessions.get(chat)
  if (!session) return
  conn.sendMessage(chat, {
    text: `*『 ⏳ 』TORNEO CANCELADO*\n> Nadie reportó el resultado del partido a tiempo.`
  }).catch(() => {})
  endSession(chat)
}

function timeoutRegistration(conn, chat) {
  const session = sessions.get(chat)
  if (!session || session.state !== 'registering') return
  conn.sendMessage(chat, {
    text: `*『 ⏳ 』TORNEO CANCELADO*\n> Nadie lo inició a tiempo (*.torneo iniciar*).`
  }).catch(() => {})
  endSession(chat)
}

async function advance(conn, m, session) {
  autoResolveByes(session)

  if (!allMatchesResolved(session)) {
    session.currentMatchIndex = session.matches.findIndex(mt => !mt.winner)
    clearTimer(session)
    session.timer = setTimeout(() => timeoutMatch(conn, m.chat), REPORT_TIMEOUT_MS)
    return announceMatch(conn, m, session)
  }

  if (session.matches.length === 1) {
    const finalMatch = session.matches[0]
    const championJid = finalMatch.winner
    const runnerUpJid = finalMatch.a === championJid ? finalMatch.b : finalMatch.a
    endSession(m.chat)
    return announceChampion(conn, m, championJid, runnerUpJid)
  }

  const winners = session.matches.map(mt => mt.winner)
  session.round++
  session.matches = buildRoundMatches(winners)
  session.currentMatchIndex = 0
  clearTimer(session)
  session.timer = setTimeout(() => timeoutMatch(conn, m.chat), REPORT_TIMEOUT_MS)
  return announceMatch(conn, m, session)
}

async function handleNew(m, ctx) {
  if (sessions.has(m.chat)) {
    return m.reply(`*『 ⚠️ 』YA HAY UN TORNEO ACTIVO*\n> Usá *.torneo estado* para verlo, o *.torneo cancelar* (admin) para cerrarlo.`)
  }

  const session = {
    organizer: m.sender,
    state: 'registering',
    players: [m.sender],
    round: 1,
    matches: [],
    currentMatchIndex: 0,
    timer: null,
  }
  session.timer = setTimeout(() => timeoutRegistration(ctx.conn, m.chat), REG_TIMEOUT_MS)
  sessions.set(m.chat, session)

  await announceRegistration(ctx.conn, m, session)
}

async function handleJoin(m, ctx) {
  const session = sessions.get(m.chat)
  if (!session || session.state !== 'registering') {
    return m.reply(`*『 ❕ 』No hay ninguna inscripción abierta ahora. Usá *.torneo* para crear un torneo.*`)
  }
  if (session.players.includes(m.sender)) return m.react('🙋')
  if (session.players.length >= MAX_PLAYERS) {
    return m.reply(`*『 ❌ 』CUPO LLENO*\n> El torneo ya tiene el máximo de ${MAX_PLAYERS} jugadores.`)
  }

  session.players.push(m.sender)
  await m.react('✅')
}

async function handleStart(m, ctx) {
  const session = sessions.get(m.chat)
  if (!session) return m.reply(`*『 ❕ 』No hay ningún torneo para iniciar. Usá *.torneo* primero.*`)
  if (session.state !== 'registering') return m.reply(`*『 ❕ 』El torneo ya está en curso.*`)
  if (!canManage(session, m, ctx)) {
    return m.reply(`*『 👤 』Solo el organizador o un admin pueden iniciar el torneo.*`)
  }
  if (session.players.length < 2) {
    return m.reply(`*『 ❌ 』FALTAN JUGADORES*\n> Necesitás al menos 2 anotados (hay ${session.players.length}).`)
  }

  clearTimer(session)
  session.state = 'in_progress'

  const shuffled = shuffle(session.players)
  const size = nextPowerOfTwo(shuffled.length)
  while (shuffled.length < size) shuffled.push(null) // BYE

  session.matches = buildRoundMatches(shuffled)
  session.currentMatchIndex = 0

  await advance(ctx.conn, m, session)
}

async function handleCancel(m, ctx) {
  const session = sessions.get(m.chat)
  if (!session) return m.reply(`*『 ❕ 』No hay ningún torneo activo.*`)
  if (!canManage(session, m, ctx)) {
    return m.reply(`*『 👤 』Solo el organizador o un admin pueden cancelar el torneo.*`)
  }
  endSession(m.chat)
  await m.reply(`*『 🛑 』TORNEO CANCELADO*`)
}

async function handleStatus(m, ctx) {
  const session = sessions.get(m.chat)
  if (!session) return m.reply(`*『 ❕ 』No hay ningún torneo activo en este grupo.*`)

  if (session.state === 'registering') {
    return announceRegistration(ctx.conn, m, session)
  }

  const match = session.matches[session.currentMatchIndex]
  await m.reply(
    `*『 🏆 』TORNEO EN CURSO*\n> Ronda ${session.round}, partido ${session.currentMatchIndex + 1}/${session.matches.length}\n` +
    `> 🅰️ @${match.a.split('@')[0]} 🆚 🅱️ @${match.b.split('@')[0]}`,
    { mentions: [match.a, match.b] }
  )
}

async function handleReport(m, ctx, side) {
  const session = sessions.get(m.chat)
  if (!session || session.state !== 'in_progress') {
    return m.reply(`*『 ❕ 』No hay ningún partido esperando resultado ahora.*`)
  }

  if (!canManage(session, m, ctx)) {
    return m.reply(`*『 👤 』Solo el organizador o un admin pueden reportar el resultado.*`)
  }

  const match = session.matches[session.currentMatchIndex]
  if (!match || match.winner) return // ya se reportó (evita doble reporte)

  // Marcado sincrónico antes de cualquier await, mismo patrón que gacha/pokemon/trivia.
  match.winner = side === 'a' ? match.a : match.b

  await advance(ctx.conn, m, session)
}

const handler = async (m, ctx) => {
  if (!m.isGroup) return m.reply(`*『 👥 』SOLO GRUPOS.*\n> Los torneos solo funcionan en grupos.`)

  const sub = (ctx.args[0] || '').toLowerCase()
  if (['unirse', 'join', 'anotarme'].includes(sub)) return handleJoin(m, ctx)
  if (['iniciar', 'start', 'comenzar'].includes(sub)) return handleStart(m, ctx)
  if (['cancelar', 'cancel'].includes(sub)) return handleCancel(m, ctx)
  if (['estado', 'status'].includes(sub)) return handleStatus(m, ctx)
  if (sub === 'ganador' || sub === 'winner') {
    const side = (ctx.args[1] || '').toLowerCase()
    if (side !== 'a' && side !== 'b') {
      return m.reply(`*『 ℹ️ 』USO*\n> ${ctx.usedPrefix}torneo ganador a\n> ${ctx.usedPrefix}torneo ganador b`)
    }
    return handleReport(m, ctx, side)
  }

  return handleNew(m, ctx)
}

handler.help = ['torneo', 'torneo unirse', 'torneo iniciar', 'torneo ganador a|b', 'torneo cancelar', 'torneo estado']
handler.desc = 'Torneo relámpago de eliminación simple con inscripción abierta y bracket automático.'
handler.tags = ['juegos']
handler.command = ['torneo', 'tourney']
handler.groupOnly = true

export default handler
