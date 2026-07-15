import { jidNormalizedUser } from '@whiskeysockets/baileys'
import config from '../../config.js'
import { askGemini } from '../../lib/gemini.js'
import { aiCooldownCache } from '../../lib/caches.js'

// Charla conversacional con Gemini. Además del comando explícito .ai/.miku,
// responde solo (sin necesitar prefijo) en 3 casos, pensados para sentirse
// como una asistente real "sin ser molesta": por privado siempre, si te
// responden citando un mensaje de la propia Miku, o si la mencionan con @ en
// un grupo. Nunca responde a mensajes sueltos random del grupo.
const MAX_HISTORY_TURNS = 6 // 6 idas y vueltas (12 entradas: usuario+modelo)

const conversations = new Map() // jid -> [{role, parts}]

function getHistory(jid) {
  return conversations.get(jid) || []
}

function pushHistory(jid, userText, modelText) {
  const history = getHistory(jid)
  history.push({ role: 'user', parts: [{ text: userText }] })
  history.push({ role: 'model', parts: [{ text: modelText }] })
  while (history.length > MAX_HISTORY_TURNS * 2) history.shift()
  conversations.set(jid, history)
}

async function responder(m, prompt) {
  const jid = m.sender
  if (aiCooldownCache.has(jid)) return

  const trimmed = (prompt || '').trim()
  if (!trimmed) return

  aiCooldownCache.set(jid, true)

  try {
    const respuesta = await askGemini(trimmed, getHistory(jid))
    pushHistory(jid, trimmed, respuesta)
    await m.reply(respuesta)
  } catch (e) {
    await m.reply(`*『 ❌ 』ERROR DE IA*\n> ${e.message}`)
  }
}

const handler = async (m, { text }) => {
  await responder(m, text)
}

handler.all = async function (m, { conn }) {
  if (m.fromMe || m.isBaileys || !m.sender || !m.message) return
  if (config.prefix.test(m.body || '')) return // ya lo maneja el sistema de comandos, sea o no válido

  const esReplyAlBot = m.quoted?.fromMe === true
  const loMencionaron = m.isGroup && m.mentionedJid?.some(jid => jidNormalizedUser(jid) === jidNormalizedUser(conn.user.id))
  const esDM = !m.isGroup

  if (!esDM && !esReplyAlBot && !loMencionaron) return

  await responder(m, m.body)
}

handler.help = ['ai <prompt>']
handler.desc = 'Hablá con Miku (Gemini AI) — también responde si le contestás un mensaje suyo, la mencionás en el grupo, o le escribís por privado.'
handler.tags = ['ia']
handler.command = ['ai', 'miku', 'gemini']

export default handler
