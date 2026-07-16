import { jidNormalizedUser } from '@whiskeysockets/baileys'
import config from '../../config.js'
import { askAI, MODEL_SMART, MODEL_FAST, SYSTEM_INSTRUCTION_LITE } from '../../lib/ai.js'
import { aiCooldownCache, aiSpontaneousCooldownCache } from '../../lib/caches.js'

// Charla conversacional con IA (Groq). Formas de activarla:
// 1. Comando explícito .ai/.miku.
// 2. Pasiva sin prefijo: por privado siempre, si te responden citando un
//    mensaje de la propia Miku, o si la mencionan con @ en un grupo.
// 3. Participación pasiva en grupo (ver GroupDb.aiMode, toggle con
//    .iamodo): sin que nadie le hable directamente, según el modo elegido
//    por el grupo —
//      - 'normal' (default): de vez en cuando, con probabilidad + cooldown
//        por grupo, y puede "elegir" no decir nada (token NOPE) si no pega
//        meterse.
//      - 'constante': responde casi todo, sin poder quedarse callada, con
//        un cooldown corto solo para no reventar la API con ráfagas.
//      - 'silencio': nunca participa por su cuenta, solo si le hablan
//        directo (mención/reply/comando/DM, ya cubierto arriba).
//    En 'normal' y 'constante' se ignoran los mensajes sin texto real
//    (solo emojis/signos) vía esTextoRelevante().
const MAX_HISTORY_TURNS = 3 // 3 idas y vueltas (6 entradas) — más corto que antes para que un intercambio raro no quede pegado por mucho tiempo
const MAX_CONTEXT_MESSAGES = 6 // mensajes recientes del grupo que se le dan de contexto (achicado para no comerse el límite de tokens/minuto de Groq)
const MAX_CONTEXT_LINE_LENGTH = 200 // trunca mensajes larguísimos antes de meterlos en el contexto
// Bajado de 10% a 5%: varios integrantes de un grupo pidieron directamente
// "bajen la IA" porque se metía muy seguido en la charla sin que nadie la
// llamara — sumado al freno de contenido de arriba, esto la hace bastante
// menos presente en modo normal.
const SPONTANEOUS_CHANCE = 0.05
const SPONTANEOUS_MIN_LENGTH = 8 // ignora mensajes muy cortos (evita ruido tipo "jaja", "ok")
// 10s en vez de 4: en un grupo muy activo, contestar cada 4s sin parar
// satura la conexión de WhatsApp (los envíos empiezan a colgarse y el bot
// queda mudo para todo, no solo para la IA) — visto en vivo con Carlos.
const CONSTANT_MODE_COOLDOWN_SEC = 10

// "Relevante" = tiene al menos una letra de verdad. Filtra mensajes de solo
// emojis/stickers/signos de puntuación (👍, 😂😂😂, "...") que antes también
// disparaban una respuesta espontánea sin decir nada real.
function esTextoRelevante(text) {
  return /\p{L}/u.test(text)
}

const conversations = new Map() // jid -> [{role:'user'|'assistant', content}] — historial 1:1 de cada persona con Miku
const groupHistory = new Map()  // chat -> [{name, text}] — últimos mensajes del grupo, solo contexto

function getHistory(jid) {
  return conversations.get(jid) || []
}

function pushHistory(jid, userText, modelText) {
  const history = getHistory(jid)
  history.push({ role: 'user', content: userText })
  history.push({ role: 'assistant', content: modelText })
  while (history.length > MAX_HISTORY_TURNS * 2) history.shift()
  conversations.set(jid, history)
}

function recordGroupMessage(chat, name, text) {
  if (!groupHistory.has(chat)) groupHistory.set(chat, [])
  const arr = groupHistory.get(chat)
  const recortado = text.length > MAX_CONTEXT_LINE_LENGTH ? text.slice(0, MAX_CONTEXT_LINE_LENGTH) + '…' : text
  arr.push({ name, text: recortado })
  while (arr.length > MAX_CONTEXT_MESSAGES) arr.shift()
}

// IMPORTANTE: excludeLast=true saca el mensaje que disparó esta respuesta del
// bloque de "trasfondo" — antes venía mezclado ahí adentro, sin distinguirse
// de mensajes de 2-3 turnos atrás, y el modelo terminaba reaccionando a un
// tema viejo en vez del mensaje actual (efecto "bola de nieve" reportado por
// Carlos: se desfasaba, mezclaba nombres de otra gente que habló antes, y
// hasta arrastró una vez contenido raro de un tema anterior). Ahora el
// mensaje actual se pasa aparte, con nombre y texto explícitos, para que no
// haya ambigüedad de a qué tiene que responder.
function buildContextBlock(chat, { excludeLast = false } = {}) {
  let arr = groupHistory.get(chat) || []
  if (excludeLast) arr = arr.slice(0, -1)
  if (!arr.length) return ''
  const lineas = arr.map(e => `${e.name}: ${e.text}`).join('\n')
  return `[Trasfondo de la charla — mensajes ANTERIORES, ya quedaron atrás, NO son lo que tenés que responder, solo te dan una idea de qué se venía hablando]\n${lineas}\n\n`
}

// Nombre real de WhatsApp de quien escribe — se lo damos siempre a la IA
// para que no tenga que adivinar (ni inventar) con quién está hablando.
function senderLabel(m) {
  return m.pushName?.trim() || 'esta persona (no tenés su nombre real, no inventes uno)'
}

async function responder(m, { rawText, apiPrompt, directo = false, model = MODEL_FAST, maxTokens = 300, systemInstruction }) {
  const jid = m.sender

  // El cooldown por remitente (8s) solo aplica a interacción DIRECTA (evita
  // spamear .ai/mención/reply). Los modos ambientales (normal/constante) ya
  // tienen su propio cooldown por CHAT (aiSpontaneousCooldownCache) seteado
  // antes de llegar acá — aplicar ACÁ TAMBIÉN el cooldown por remitente
  // rompía las menciones directas: si a alguien le tocó una respuesta
  // espontánea, quedaba bloqueado sin poder mencionar a Miku por 8s más,
  // en silencio y sin aviso.
  if (directo) {
    if (aiCooldownCache.has(jid)) return
    aiCooldownCache.set(jid, true)
  }

  const trimmed = (rawText || '').trim()
  if (!trimmed) return

  // El historial de conversación (getHistory/pushHistory) SOLO se usa en
  // interacción directa. Si también se usara en modo ambiental, una
  // respuesta espontánea rara quedaba en el historial de esa persona y se
  // le seguía "pegando" en cada mención/DM posterior, sin importar lo que
  // preguntara — un caso real reportado por Carlos (la IA se enganchó de
  // un chiste viejo y no soltaba el tema).
  const history = directo ? getHistory(jid) : []

  try {
    const respuesta = await askAI(apiPrompt || trimmed, history, model, maxTokens, systemInstruction)
    if (/^NOPE\b/i.test(respuesta.trim())) return // decidió no sumarse (solo puede pasar en modo ambiental)

    if (directo) pushHistory(jid, trimmed, respuesta)
    await m.reply(respuesta)
  } catch (e) {
    if (!directo) return // en modos ambientales no se ensucia el grupo con errores técnicos
    await m.reply(`*『 ❌ 』ERROR DE IA*\n> ${e.message}`)
  }
}

const handler = async (m, { text }) => {
  // Escape hatch manual: si la conversación de alguien con Miku queda
  // "pegada" en algo raro (pasó de verdad — ver el comentario en
  // responder()), cualquiera puede resetear SU PROPIO historial sin
  // necesitar que se reinicie el bot entero.
  if (['olvidar', 'reset', 'forget'].includes((text || '').trim().toLowerCase())) {
    conversations.delete(m.sender)
    return m.reply(`*『 🧹 』Listo, me olvidé de nuestra charla anterior — arrancamos de cero.*`)
  }

  // OJO: acá NO se agrega buildContextBlock() a propósito. Meter los
  // mensajes recientes de otras personas del grupo en una pregunta directa
  // ("quién soy") confundía al modelo y terminaba dirigiéndose a esas otras
  // personas por nombre en vez de responderle solo a quien preguntó. El
  // contexto grupal queda reservado para el modo espontáneo/constante, que
  // es donde realmente hace falta.
  const nombre = senderLabel(m)
  const apiPrompt = `${nombre} te escribe${m.isGroup ? '' : ' por privado'}: ${text}`
  await responder(m, { rawText: text, apiPrompt, model: MODEL_SMART, directo: true, systemInstruction: SYSTEM_INSTRUCTION_LITE })
}

// Mensajes tipo "Bot <algo>" — el estilo de invocación de OTROS bots del
// grupo (ej. Nekos Club, que no usa un prefijo como el nuestro sino la
// palabra "Bot" al principio). Sin este filtro, Miku los guardaba como
// contexto de charla normal y a veces hasta les contestaba, mezclando
// nombres de gente que en realidad le estaba hablando al otro bot.
function esParaOtroBot(text) {
  return /^bot\b/i.test(text)
}

handler.all = async function (m, { conn, groupDb }) {
  if (m.fromMe || m.isBaileys || !m.sender || !m.message) return

  const body = m.body || ''
  const esComando = config.prefix.test(body)
  const paraOtroBot = esParaOtroBot(body.trim())

  // Guarda todo mensaje real de chat grupal (que no sea un comando ni algo
  // dirigido a otro bot) como contexto, se use o no en esta pasada — así
  // cuando Miku sí participa (mencionada o espontáneamente) ya sabe de qué
  // se viene hablando.
  if (m.isGroup && body.trim() && !esComando && !paraOtroBot) {
    recordGroupMessage(m.chat, m.pushName || 'Alguien', body.trim())
  }

  if (esComando) return // ya lo maneja el sistema de comandos, sea o no válido

  const esReplyAlBot = m.quoted?.fromMe === true
  // OJO: comparar solo contra conn.user.id no alcanza — WhatsApp puede taggear
  // al bot con su identificador @lid en vez del @s.whatsapp.net de siempre
  // (mismo fenómeno ya documentado y parchado para detección de admin en
  // handler.js/getAdminStatus). Si solo se chequeaba conn.user.id, una
  // mención real quedaba sin detectar cada vez que WhatsApp mandaba el @lid,
  // y el mensaje cascoteaba hacia la sección ambiental — donde 'silencio' lo
  // frena en seco. En 'normal'/'constante' el mismo bug quedaba tapado
  // porque el modo ambiental igual respondía (por probabilidad o siempre),
  // dando la falsa impresión de que la mención "funcionaba".
  const botIds = [conn.user?.id, conn.user?.lid].filter(Boolean)
  const loMencionaron = m.isGroup && m.mentionedJid?.some(jid =>
    botIds.some(botId => jidNormalizedUser(jid) === jidNormalizedUser(botId))
  )
  const esDM = !m.isGroup

  if (esDM || esReplyAlBot || loMencionaron) {
    // Mismo motivo que en el handler de arriba: sin contexto grupal acá,
    // para que responda solo a quien le habló y no a todo el chat.
    const nombre = senderLabel(m)
    const apiPrompt = m.isGroup
      ? `${nombre} te habla directamente (te mencionó o te respondió): ${body}`
      : `${nombre} te escribe por privado: ${body}`
    return responder(m, { rawText: body, apiPrompt, model: MODEL_SMART, directo: true, systemInstruction: SYSTEM_INSTRUCTION_LITE })
  }

  // A partir de acá: mensaje de grupo normal, nadie le habló a Miku directamente.
  if (!m.isGroup) return
  if (groupDb?.disabledCategories?.includes('ia')) return
  if (!body.trim()) return
  if (paraOtroBot) return // no participar en mensajes tipo "Bot <algo>" dirigidos a otro bot del grupo

  const modo = groupDb?.aiMode || 'normal'
  if (modo === 'silencio') return // solo responde si le hablan directo — ya se resolvió más arriba

  const texto = body.trim()
  if (!esTextoRelevante(texto)) return // sin letras de verdad (solo emojis/signos) — nada que comentar

  // Modo constante (.iamodo constante): responde casi todo, sin poder
  // decidir quedarse callada, con un cooldown corto solo anti-ráfaga.
  if (modo === 'constante') {
    if (aiSpontaneousCooldownCache.has(m.chat)) return
    aiSpontaneousCooldownCache.set(m.chat, true, CONSTANT_MODE_COOLDOWN_SEC)

    // A pedido de Carlos: modo constante prueba SIN la capa de reglas de
    // comportamiento (personalidad, anti-comentario-personal, etc.) — solo
    // identidad + capacidades reales (SYSTEM_INSTRUCTION_LITE) — para ver si
    // el modelo responde más coherente con menos instrucción encima.
    const nombreActual = m.pushName || 'Alguien'
    const apiPrompt = `${buildContextBlock(m.chat, { excludeLast: true })}` +
      `${nombreActual} ACABA DE ESCRIBIR AHORA MISMO: "${texto}"\n\n` +
      `Estás participando activamente de esta conversación grupal como una integrante más del chat — ` +
      `nadie te habló a vos directamente, pero estás en "modo charla" y siempre sumás algo (una gracia, ` +
      `una opinión corta, una reacción) a lo que ${nombreActual} acaba de decir AHORA, no a temas del ` +
      `trasfondo de arriba (esos ya quedaron atrás). Respondé siempre, breve y natural.`

    return responder(m, { rawText: body, apiPrompt, model: MODEL_FAST, maxTokens: 120, systemInstruction: SYSTEM_INSTRUCTION_LITE })
  }

  // Modo normal: participación ocasional, puede "elegir" no decir nada. Usa
  // MODEL_SMART (no MODEL_FAST): el volumen acá es bajo por diseño (10% de
  // probabilidad + 2 min de cooldown por grupo), así que entra de sobra en
  // la cuota de 1.000/día del modelo grande, y se nota mucho la diferencia
  // de calidad en algo tan simple como un "hola" suelto en el grupo.
  if (texto.length < SPONTANEOUS_MIN_LENGTH) return
  if (aiSpontaneousCooldownCache.has(m.chat)) return
  if (Math.random() > SPONTANEOUS_CHANCE) return

  aiSpontaneousCooldownCache.set(m.chat, true) // se consume el intento, hable o no, para no evaluar de nuevo enseguida

  const nombreActual = m.pushName || 'Alguien'
  const apiPrompt = `${buildContextBlock(m.chat, { excludeLast: true })}` +
    `${nombreActual} ACABA DE ESCRIBIR AHORA MISMO: "${texto}"\n\n` +
    `Estás mirando esta conversación grupal como una integrante más del chat — nadie te habló a vos directamente. ` +
    `Si te parece natural sumar un comentario breve sobre lo que ${nombreActual} acaba de decir AHORA (una gracia, ` +
    `una opinión corta, algo que aporte), respondé eso — no reacciones a temas del trasfondo de arriba, esos ya ` +
    `quedaron atrás. Prohibido opinar, especular o hacer chistes sobre el estado de ánimo, carácter o comportamiento ` +
    `de una persona puntual (nada de "fulano se ofendió", "alguien tiene mal día", etc.) — comentá el tema, nunca a ` +
    `la gente, salvo que alguien te haya hablado a vos directamente o te haya faltado el respeto. ` +
    `Si no tenés nada que aportar o no pega meterte ahora, respondé EXACTAMENTE la palabra NOPE y nada más.`

  await responder(m, { rawText: body, apiPrompt, model: MODEL_SMART, maxTokens: 200 })
}

handler.help = ['ai <prompt>', 'ai olvidar']
handler.desc = 'Hablá con Miku (IA) — responde si le contestás un mensaje suyo, la mencionás, o le escribís por privado. *.ai olvidar* resetea tu charla si se traba en algo raro. Ver .iamodo para elegir si además participa sola en el grupo (normal/constante/silencio).'
handler.tags = ['ia']
handler.command = ['ai', 'miku']

export default handler
