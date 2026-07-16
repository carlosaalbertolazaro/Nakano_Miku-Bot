import config from '../../config.js'
import { plugins } from '../../handler.js'

const START_TIME = Date.now()

// Imágenes de Nakano Miku provistas por Carlos (ibb.co), verificadas (200 OK,
// image/jpeg) antes de agregarlas.
const IMAGENES = [
  'https://i.ibb.co/ZQRx7YG/09ed7487d4247be8c312d028b745bc6e.jpg',
  'https://i.ibb.co/G3byH4TP/37f2fc6336a20e75bd75d43656e6e2b0.jpg',
  'https://i.ibb.co/Pv7yCCgj/77739e7093a20cf6acdbb55ed94431b3.jpg',
  'https://i.ibb.co/RTJx2GQb/66639a2c62e24b6433dab377a5661e84.jpg',
  'https://i.ibb.co/5WqBpQ1f/4c5d5a900adcb5a7ff64dd3ff8d7d35c.jpg',
  'https://i.ibb.co/9kjZrTHQ/abf465e6523544acbccb7bfad878be56-1.jpg',
]

const ETIQUETAS = {
  info:          'ℹ️  Información',
  group:         '👥 Gestión de Grupos',
  tools:         '🔧 Herramientas',
  descargas:     '📥 Descargas',
  convertidores: '🔄 Convertidores',
  juegos:        '🎮 Minijuegos',
  economia:      '💰 Economía y Niveles',
  anime:         '🌸 Anime y Gacha',
  pokemon:       '🐾 Pokémon',
  cartas:        '🃏 Cartas (Yu-Gi-Oh)',
  casino:        '🎰 Casino',
  roleplay:      '💞 Rol / Interacción',
  ia:            '🤖 Asistente IA',
  perfiles:      '🪪 Perfiles',
  otros:         '📦 Otros',
}

const getTime = () => {
  const t = Math.floor((Date.now() - START_TIME) / 1000)
  const d = Math.floor(t / 86400), h = Math.floor((t / 3600) % 24), min = Math.floor((t / 60) % 60), s = t % 60
  return `${d > 0 ? d + 'd ' : ''}${h > 0 ? h + 'h ' : ''}${min > 0 ? min + 'm ' : ''}${s}s`
}

function getCategorias(isOwner, groupDb) {
  const categorias = {}
  let total = 0
  for (const p of Object.values(plugins)) {
    if (!p || !p.help) continue
    if ((p.owner || p.ownerOnly) && !isOwner) continue
    const tagRaw = Array.isArray(p.tags) ? p.tags[0] : (p.tags || 'otros')
    const tag = tagRaw.toLowerCase()
    if (groupDb?.disabledCategories?.includes(tag)) continue
    const cmdsReales = Array.isArray(p.command) ? p.command : [p.command]
    if (groupDb && cmdsReales.every(c => groupDb.disabledCmds?.includes(c))) continue
    if (!categorias[tag]) categorias[tag] = []
    const cmds = Array.isArray(p.help) ? p.help : [p.help]
    for (const cmd of cmds) { categorias[tag].push({ cmd, desc: p.desc || '' }); total++ }
  }
  return { categorias, total }
}

function getOrdenActivo(isOwner, groupDb) {
  const { categorias, total } = getCategorias(isOwner, groupDb)
  const orden = ['info', 'group', 'descargas', 'convertidores', 'juegos', 'economia', 'perfiles', 'casino', 'anime', 'pokemon', 'cartas', 'roleplay', 'ia', 'tools', 'otros']
  const ordenFinal = orden.filter(k => categorias[k]?.length).concat(
    Object.keys(categorias).filter(k => !orden.includes(k))
  )
  return { categorias, total, ordenFinal }
}

// Mensajes de texto plano únicamente. Los botones/listas nativas de WhatsApp
// (nativeFlowMessage, buttons:[{sections}]) dejaron de ser confiables para
// cuentas/números no verificados como negocio — a veces no responden al
// toque, a veces el destinatario ve "mensaje no compatible con tu versión de
// WhatsApp". Texto plano funciona siempre, sin importar la versión del
// cliente. Los atajos .menu1..menu20 ya existían como comandos de texto.
async function enviarSubmenu(conn, m, tag, isOwner, usedPrefix, groupDb) {
  const { categorias } = getOrdenActivo(isOwner, groupDb)
  const comandos = categorias[tag]
  if (!comandos?.length) return m.reply(`*『 ❌ 』Sin comandos activos en esta categoría.*`)

  const nombreCat = ETIQUETAS[tag] || ETIQUETAS.otros
  const prefix = usedPrefix || '.'

  let caption = `*┏━━•❈ ${nombreCat.toUpperCase()} ❈•━━┓*\n\n`
  for (const { cmd, desc } of comandos) {
    caption += `✧ *${prefix}${cmd}*\n`
    if (desc) caption += `   ${desc}\n`
    caption += `\n`
  }
  caption += `*┗━━━━•❅•°•❈•°•❅•━━━━┛*\n\n`
  caption += `> 🔙 Escribí *${prefix}menu* para volver al menú principal.`

  const imageUrl = IMAGENES.length ? IMAGENES[Math.floor(Math.random() * IMAGENES.length)] : null

  if (imageUrl) {
    await conn.sendMessage(m.chat, { image: { url: imageUrl }, caption }, { quoted: m })
  } else {
    await m.reply(caption)
  }
}

const handler = async (m, { conn, usedPrefix, isOwner, command, groupDb }) => {
  const { categorias, total, ordenFinal } = getOrdenActivo(isOwner, groupDb)

  const numMatch = command.match(/^menu(\d+)$/)
  if (numMatch) {
    const idx = parseInt(numMatch[1]) - 1
    const tag = ordenFinal[idx]
    if (tag) return enviarSubmenu(conn, m, tag, isOwner, usedPrefix, groupDb)
    return m.reply(`*『 ❌ 』Categoría no encontrada.*`)
  }

  const nombreUsuario = m.pushName || 'Usuario'
  const prefix = usedPrefix || '.'
  const currentBotName = conn.botname || config.botName

  const listaCategorias = ordenFinal.map((tag, i) => {
    const nombreCat = ETIQUETAS[tag] || ETIQUETAS.otros
    const n = categorias[tag]?.length || 0
    return `> *${i + 1}.* ${nombreCat} — ${n} comandos · escribí *${prefix}menu${i + 1}*`
  }).join('\n')

  const textoMenu =
`*┏━━•❈ 🤖 ${currentBotName} ❈•━━┓*

> 👋 *Hola, ${nombreUsuario}*

*『 📊 ESTADÍSTICAS 』*
▢ 👑 *Creador:* ${config.ownerName}
▢ ⚙️ *Prefijo:* [ *${prefix}* ]
▢ ⏱️ *Activo:* ${getTime()}
▢ 📦 *Comandos:* ${total}

*『 📁 CATEGORÍAS 』*
${listaCategorias}
*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  const imageUrl = IMAGENES.length ? IMAGENES[Math.floor(Math.random() * IMAGENES.length)] : null

  if (imageUrl) {
    await conn.sendMessage(m.chat, { image: { url: imageUrl }, caption: textoMenu }, { quoted: m })
  } else {
    await m.reply(textoMenu)
  }
}

handler.help = ['menu']
handler.tags = ['info']
handler.command = [
  'menu', 'help', 'ayuda', 'menú',
  ...Array.from({ length: 20 }, (_, i) => `menu${i + 1}`)
]

export default handler
