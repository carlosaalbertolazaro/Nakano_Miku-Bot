// Matchmaking de squads: varias lobbies pueden estar abiertas a la vez en un
// mismo grupo (a diferencia de fun-tourney.js, que es una sesión única por
// chat), porque en la práctica la gente arma grupos para juegos distintos al
// mismo tiempo. Estado 100% en memoria (Map chat -> lobby[]), mismo patrón
// self-contained que el resto de los minijuegos.
const lobbiesByChat = new Map() // chat -> Lobby[]
const LOBBY_TTL_MS = 20 * 60 * 1000

function getLobbies(chat) {
  if (!lobbiesByChat.has(chat)) lobbiesByChat.set(chat, [])
  return lobbiesByChat.get(chat)
}

function nextId(chat) {
  const lobbies = getLobbies(chat)
  return lobbies.reduce((max, l) => Math.max(max, l.id), 0) + 1
}

function expireLobby(chat, id) {
  const lobbies = getLobbies(chat)
  const idx = lobbies.findIndex(l => l.id === id)
  if (idx !== -1) lobbies.splice(idx, 1)
}

function formatLobby(l) {
  const jugadores = l.players.map((p, i) => `> ${i + 1}. @${p.split('@')[0]}`).join('\n')
  return `> *#${l.id} — ${l.game}*\n` +
    `> 👥 ${l.players.length}/${l.slots} cupos\n` +
    `${jugadores}\n`
}

async function crear(m, { conn, args, usedPrefix }) {
  const slots = parseInt(args[args.length - 1])
  if (!slots || slots < 2 || slots > 50 || isNaN(slots)) {
    return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}lobby crear <juego> <cupos>\n> Ejemplo: ${usedPrefix}lobby crear Valorant 5`)
  }

  const juego = args.slice(1, -1).join(' ').trim()
  if (!juego) {
    return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}lobby crear <juego> <cupos>\n> Ejemplo: ${usedPrefix}lobby crear Valorant 5`)
  }

  const lobbies = getLobbies(m.chat)
  const id = nextId(m.chat)
  const lobby = { id, chat: m.chat, creator: m.sender, game: juego, slots, players: [m.sender], full: false }
  lobbies.push(lobby)
  setTimeout(() => expireLobby(m.chat, id), LOBBY_TTL_MS)

  await conn.sendMessage(m.chat, {
    text: `*┏━━•❈ 🎮 NUEVA LOBBY ❈•━━┓*\n\n${formatLobby(lobby)}\n` +
      `> ✍️ Escribí *${usedPrefix}lobby unirme ${id}* para sumarte.\n` +
      `> ⏳ Se cierra sola en 20 minutos si no se llena.\n` +
      `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`,
    mentions: lobby.players,
  }, { quoted: m })
}

async function unirme(m, { conn, args, usedPrefix }) {
  const id = parseInt(args[1])
  const lobby = getLobbies(m.chat).find(l => l.id === id)
  if (!lobby) return m.reply(`*『 ❌ 』Lobby no encontrada.*\n> Mirá *${usedPrefix}lobby* para ver las activas.`)
  if (lobby.full) return m.reply(`*『 ❌ 』Esa lobby ya está completa.*`)
  if (lobby.players.includes(m.sender)) return m.react('🙋')

  if (lobby.players.length >= lobby.slots) return m.reply(`*『 ❌ 』Esa lobby ya está completa.*`)

  lobby.players.push(m.sender)
  await m.react('✅')

  if (lobby.players.length >= lobby.slots) {
    lobby.full = true
    await conn.sendMessage(m.chat, {
      text: `*┏━━•❈ 🎉 ¡LOBBY COMPLETA! ❈•━━┓*\n\n` +
        `> *#${lobby.id} — ${lobby.game}*\n` +
        `> ¡Ya están todos! A jugar 🎮\n\n` +
        `${lobby.players.map(p => `@${p.split('@')[0]}`).join(' ')}\n` +
        `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`,
      mentions: lobby.players,
    })
  }
}

async function salir(m, { args, usedPrefix }) {
  const id = parseInt(args[1])
  const lobby = getLobbies(m.chat).find(l => l.id === id)
  if (!lobby) return m.reply(`*『 ❌ 』Lobby no encontrada.*`)

  const idx = lobby.players.indexOf(m.sender)
  if (idx === -1) return m.reply(`*『 ❕ 』No estás anotado en esa lobby.*`)

  lobby.players.splice(idx, 1)
  lobby.full = false
  if (!lobby.players.length) expireLobby(m.chat, id)

  await m.reply(`*『 ✅ 』Saliste de la lobby #${id}.*`)
}

async function cancelar(m, { args, isAdmin, isOwner }) {
  const id = parseInt(args[1])
  const lobbies = getLobbies(m.chat)
  const lobby = lobbies.find(l => l.id === id)
  if (!lobby) return m.reply(`*『 ❌ 』Lobby no encontrada.*`)

  if (lobby.creator !== m.sender && !isAdmin && !isOwner) {
    return m.reply(`*『 👤 』Solo quien la creó o un admin puede cancelarla.*`)
  }

  expireLobby(m.chat, id)
  await m.reply(`*『 🗑️ 』Lobby #${id} cancelada.*`)
}

async function listar(m, { usedPrefix }) {
  const lobbies = getLobbies(m.chat)
  if (!lobbies.length) {
    return m.reply(`*『 🎮 』SIN LOBBIES*\n> No hay ninguna abierta. Creá una con *${usedPrefix}lobby crear <juego> <cupos>*.`)
  }

  let txt = `*┏━━•❈ 🎮 LOBBIES ABIERTAS ❈•━━┓*\n\n`
  for (const l of lobbies) txt += formatLobby(l) + '\n'
  txt += `> Escribí *${usedPrefix}lobby unirme <numero>* para sumarte.\n`
  txt += `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  await m.reply(txt)
}

const handler = async (m, ctx) => {
  if (!m.isGroup) return m.reply(`*『 👥 』SOLO GRUPOS.*\n> El matchmaking de lobbies solo funciona en grupos.`)

  const sub = (ctx.args[0] || '').toLowerCase()
  if (sub === 'crear') return crear(m, ctx)
  if (['unirme', 'unirse', 'join'].includes(sub)) return unirme(m, ctx)
  if (['salir', 'leave'].includes(sub)) return salir(m, ctx)
  if (['cancelar', 'cancel'].includes(sub)) return cancelar(m, ctx)

  return listar(m, ctx)
}

handler.help = ['lobby', 'lobby crear <juego> <cupos>', 'lobby unirme <numero>', 'lobby salir <numero>', 'lobby cancelar <numero>']
handler.desc = 'Armá squads para jugar: creá una lobby con cupos, la gente se anota y avisa cuando está completa.'
handler.tags = ['juegos']
handler.command = ['lobby', 'lobbies', 'squad']
handler.groupOnly = true

export default handler
