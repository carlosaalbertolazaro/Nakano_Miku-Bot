import TagDb from '../../lib/database/TagDb.js'

// Comando explícito (no scanea texto libre con '#') para no ser ambiguo con
// un intento de comando real si el prefijo configurado llegara a ser '#'.
// Se mantiene la misma UX basada en subcomandos que el resto del bot.
const TAG_RX = /^[a-z0-9_]{2,20}$/

function normalizarTag(s) {
  // NFD + filtro alfanumérico alcanza para sacar acentos (descompone é -> e
  // + marca de acento, que el filtro descarta) sin necesitar un rango de
  // diacríticos escrito a mano.
  return (s || '').toLowerCase().trim().normalize('NFD').replace(/[^a-z0-9_]/g, '')
}

async function unir(m, { args, usedPrefix, groupDb, isAdmin, isOwner }) {
  if (!isAdmin && !isOwner) return m.reply(`*『 👤 』Solo un admin puede suscribir el grupo a un canal.*`)

  const tag = normalizarTag(args[1])
  if (!TAG_RX.test(tag)) {
    return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}canal unir <nombre>\n> Solo letras/números/guion bajo, 2-20 caracteres.`)
  }

  const added = await TagDb.subscribe(m.chat, tag)
  if (!added) return m.reply(`*『 ❕ 』Este grupo ya está suscrito a #${tag}.*`)

  await m.reply(`*『 ✅ 』Grupo suscrito al canal global #${tag}.*\n> Usá *${usedPrefix}canal enviar ${tag} <mensaje>* para mandar algo a los demás grupos suscritos.`)
}

async function salir(m, { args, usedPrefix, isAdmin, isOwner }) {
  if (!isAdmin && !isOwner) return m.reply(`*『 👤 』Solo un admin puede sacar al grupo de un canal.*`)

  const tag = normalizarTag(args[1])
  const removed = await TagDb.unsubscribe(m.chat, tag)
  if (!removed) return m.reply(`*『 ❌ 』Este grupo no estaba suscrito a #${tag}.*`)

  await m.reply(`*『 ✅ 』Grupo desuscrito del canal #${tag}.*`)
}

async function lista(m, { usedPrefix }) {
  const propios = await TagDb.getGroupTags(m.chat)
  const todos = await TagDb.listTags()

  let txt = `*┏━━•❈ 🌐 CANALES GLOBALES ❈•━━┓*\n\n`
  txt += propios.length
    ? `*『 📌 Este grupo está en 』*\n${propios.map(t => `> #${t}`).join('\n')}\n\n`
    : `> Este grupo no está suscrito a ningún canal.\n\n`

  if (todos.length) {
    txt += `*『 🔎 Canales existentes 』*\n`
    txt += todos.map(t => `> #${t.name} (${t.groupCount} grupos)`).join('\n') + '\n\n'
  }

  txt += `> ${usedPrefix}canal unir <nombre>\n> ${usedPrefix}canal salir <nombre>\n> ${usedPrefix}canal enviar <nombre> <mensaje>\n`
  txt += `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  await m.reply(txt)
}

async function enviar(m, { conn, args, usedPrefix, groupMetadata }) {
  const tag = normalizarTag(args[1])
  const mensaje = args.slice(2).join(' ').trim()

  if (!TAG_RX.test(tag) || !mensaje) {
    return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}canal enviar <nombre> <mensaje>`)
  }

  const grupos = await TagDb.getSubscribedGroups(tag)
  if (!grupos.includes(m.chat)) {
    return m.reply(`*『 ❌ 』Este grupo no está suscrito a #${tag}.*\n> Suscribite con *${usedPrefix}canal unir ${tag}* primero.`)
  }

  const destinos = grupos.filter(g => g !== m.chat)
  if (!destinos.length) {
    return m.reply(`*『 ❕ 』Ningún otro grupo está suscrito a #${tag} todavía.*`)
  }

  const origenNombre = groupMetadata?.subject || 'un grupo'
  const texto = `*┏━━•❈ 🌐 #${tag} ❈•━━┓*\n\n` +
    `> 📍 Desde: *${origenNombre}*\n` +
    `> 👤 ${m.pushName || 'Alguien'}:\n> ${mensaje}\n` +
    `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  let enviados = 0
  for (const destino of destinos) {
    try {
      await conn.sendMessage(destino, { text: texto })
      enviados++
    } catch {
      // Un grupo destino puede haber removido al bot o no existir más —
      // se ignora ese destino puntual y se sigue con los demás.
    }
  }

  await m.react('📡')
  if (enviados < destinos.length) {
    await m.reply(`*『 ⚠️ 』Se envió a ${enviados}/${destinos.length} grupos (algunos fallaron).*`)
  }
}

const handler = async (m, ctx) => {
  if (!m.isGroup) return m.reply(`*『 👥 』SOLO GRUPOS.*\n> Los canales globales solo funcionan en grupos.`)

  const sub = (ctx.args[0] || '').toLowerCase()
  if (['unir', 'suscribir', 'join'].includes(sub)) return unir(m, ctx)
  if (['salir', 'desuscribir', 'leave'].includes(sub)) return salir(m, ctx)
  if (['enviar', 'mandar', 'send'].includes(sub)) return enviar(m, ctx)

  return lista(m, ctx)
}

handler.help = ['canal', 'canal unir <nombre>', 'canal salir <nombre>', 'canal enviar <nombre> <mensaje>']
handler.desc = 'Canales globales: conectá tu grupo a un tema (ej #anime) y mandá mensajes a todos los demás grupos suscritos.'
handler.tags = ['group']
handler.command = ['canal', 'canales']
handler.groupOnly = true

export default handler
