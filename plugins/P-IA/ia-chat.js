import { jidNormalizedUser } from '@whiskeysockets/baileys'
import config from '../../config.js'
import { askGemini } from '../../lib/gemini.js'
import { aiCooldownCache, aiSpontaneousCooldownCache } from '../../lib/caches.js'

// Charla conversacional con Gemini. Tres formas de activarla:
// 1. Comando explícito .ai/.miku/.gemini.
// 2. Pasiva sin prefijo: por privado siempre, si te responden citando un
//    mensaje de la propia Miku, o si la mencionan con @ en un grupo.
// 3. Participación ESPONTÁNEA en grupos (nueva): de vez en cuando, sin que
//    nadie le hable directamente, puede sumar un comentario breve a la
//    conversación — pensada para sentirse como una integrante más del chat,
//    no como una asistente que solo responde si le preguntan. Para que no
//    sea invasiva se combinan 3 frenos: probabilidad baja por mensaje,
//    cooldown largo por GRUPO (no por usuario), y que el propio modelo
//    puede "elegir" no decir nada (token NOPE) si no pega meterse.
const MAX_HISTORY_TURNS = 6 // 6 idas y vueltas (12 entradas: usuario+modelo)
const MAX_CONTEXT_MESSAGES = 12 // mensajes recientes del grupo que se le dan de contexto
const SPONTANEOUS_CHANCE = 0.04 // 4% de probabilidad por mensaje "elegible"
const SPONTANEOUS_MIN_LENGTH = 12 // ignora mensajes muy cortos (evita ruido tipo "jaja", "ok")

const conversations = new Map() // jid -> [{role, parts}] — historial 1:1 de cada persona con Miku
const groupHistory = new Map()  // chat -> [{name, text}] — últimos mensajes del grupo, solo contexto

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

function recordGroupMessage(chat, name, text) {
  if (!groupHistory.has(chat)) groupHistory.set(chat, [])
  const arr = groupHistory.get(chat)
  arr.push({ name, text })
  while (arr.length > MAX_CONTEXT_MESSAGES) arr.shift()
}

function buildContextBlock(chat) {
  const arr = groupHistory.get(chat) || []
  if (!arr.length) return ''
  const lineas = arr.map(e => `${e.name}: ${e.text}`).join('\n')
  return `[Contexto reciente del grupo — no son mensajes tuyos, es solo para que sepas de qué se viene hablando]\n${lineas}\n\n`
}

async function responder(m, { rawText, apiPrompt, silent = false }) {
  const jid = m.sender
  if (aiCooldownCache.has(jid)) return

  const trimmed = (rawText || '').trim()
  if (!trimmed) return

  aiCooldownCache.set(jid, true)

  try {
    const respuesta = await askGemini(apiPrompt || trimmed, getHistory(jid))
    if (silent && /^NOPE\b/i.test(respuesta.trim())) return // decidió no sumarse, no se manda nada

    pushHistory(jid, trimmed, respuesta)
    await m.reply(respuesta)
  } catch (e) {
    if (silent) return // en modo espontáneo no se ensucia el grupo con errores técnicos
    await m.reply(`*『 ❌ 』ERROR DE IA*\n> ${e.message}`)
  }
}

const handler = async (m, { text }) => {
  const apiPrompt = m.isGroup
    ? `${buildContextBlock(m.chat)}Mensaje de ${m.pushName || 'alguien'}: ${text}`
    : text
  await responder(m, { rawText: text, apiPrompt })
}

handler.all = async function (m, { conn, groupDb }) {
  if (m.fromMe || m.isBaileys || !m.sender || !m.message) return

  const body = m.body || ''
  const esComando = config.prefix.test(body)

  // Guarda todo mensaje real de chat grupal (que no sea un comando) como
  // contexto, se use o no en esta pasada — así cuando Miku sí participa
  // (mencionada o espontáneamente) ya sabe de qué se viene hablando.
  if (m.isGroup && body.trim() && !esComando) {
    recordGroupMessage(m.chat, m.pushName || 'Alguien', body.trim())
  }

  if (esComando) return // ya lo maneja el sistema de comandos, sea o no válido

  const esReplyAlBot = m.quoted?.fromMe === true
  const loMencionaron = m.isGroup && m.mentionedJid?.some(jid => jidNormalizedUser(jid) === jidNormalizedUser(conn.user.id))
  const esDM = !m.isGroup

  if (esDM || esReplyAlBot || loMencionaron) {
    const apiPrompt = m.isGroup
      ? `${buildContextBlock(m.chat)}${m.pushName || 'Alguien'} te habla directamente (te mencionó o te respondió): ${body}`
      : body
    return responder(m, { rawText: body, apiPrompt })
  }

  // A partir de acá: mensaje de grupo normal, nadie le habló a Miku directamente.
  // Posible participación espontánea, muy poco frecuente a propósito.
  if (!m.isGroup) return
  if (groupDb?.disabledCategories?.includes('ia')) return
  if (body.trim().length < SPONTANEOUS_MIN_LENGTH) return
  if (aiSpontaneousCooldownCache.has(m.chat)) return
  if (Math.random() > SPONTANEOUS_CHANCE) return

  aiSpontaneousCooldownCache.set(m.chat, true) // se consume el intento, hable o no, para no evaluar de nuevo enseguida

  const apiPrompt = `${buildContextBlock(m.chat)}` +
    `Estás mirando esta conversación grupal como una integrante más del chat — nadie te habló a vos directamente. ` +
    `Si te parece natural sumar un comentario breve (una gracia, una opinión corta, algo que aporte a lo que se viene hablando), respondé eso. ` +
    `Si no tenés nada que aportar o no pega meterte ahora, respondé EXACTAMENTE la palabra NOPE y nada más.`

  await responder(m, { rawText: body, apiPrompt, silent: true })
}

handler.help = ['ai <prompt>']
handler.desc = 'Hablá con Miku (Gemini AI) — responde si le contestás un mensaje suyo, la mencionás, o le escribís por privado. En grupos, a veces también se suma sola a la charla.'
handler.tags = ['ia']
handler.command = ['ai', 'miku', 'gemini']

export default handler
