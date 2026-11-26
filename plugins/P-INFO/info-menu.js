import config from '../../config.js'
import { plugins } from '../../handler.js'
import { fetchImageBuffer } from '../../lib/sendImageSafe.js'
import { ROLEPLAY_ACTION_COUNT, ROLEPLAY_MENU_PAGES } from '../../lib/roleplayCatalog.js'

const START_TIME = Date.now()
const CATEGORY_PAGE_SIZE = 10

// La foto decorativa vuelve a formar parte del menú, pero se envía aparte y
// después del texto. Si el proveedor o WhatsApp se cuelga, el menú ya llegó.
const imageBufferCache = new Map()
const imagenesPendientes = new Set()

async function getRandomMenuImage() {
  const url = IMAGENES[Math.floor(Math.random() * IMAGENES.length)]
  if (imageBufferCache.has(url)) return imageBufferCache.get(url)
  const buffer = await fetchImageBuffer(url)
  if (buffer) imageBufferCache.set(url, buffer)
  return buffer
}

async function enviarImagenMenu(conn, m) {
  if (imagenesPendientes.has(m.chat)) return
  imagenesPendientes.add(m.chat)
  try {
    const imageBuffer = await getRandomMenuImage()
    if (!imageBuffer) return
    await conn.sendMessage(m.chat, {
      image: imageBuffer,
      caption: `*🌸 ${conn.botname || config.botName}*`,
    }, { quoted: m })
  } catch (error) {
    console.warn('[MENU] No se pudo enviar la foto decorativa:', error.message)
  } finally {
    imagenesPendientes.delete(m.chat)
  }
}

const IMAGENES = [
  'https://i.ibb.co/ZQRx7YG/09ed7487d4247be8c312d028b745bc6e.jpg',
  'https://i.ibb.co/G3byH4TP/37f2fc6336a20e75bd75d43656e6e2b0.jpg',
  'https://i.ibb.co/Pv7yCCgj/77739e7093a20cf6acdbb55ed94431b3.jpg',
  'https://i.ibb.co/RTJx2GQb/66639a2c62e24b6433dab377a5661e84.jpg',
  'https://i.ibb.co/5WqBpQ1f/4c5d5a900adcb5a7ff64dd3ff8d7d35c.jpg',
  'https://i.ibb.co/9kjZrTHQ/abf465e6523544acbccb7bfad878be56-1.jpg',
]

const ETIQUETAS = {
  info:          'ℹ️ Información',
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
  stickers:      '🖼️ Stickers',
  otros:         '📦 Otros',
}

const COMANDO_CATEGORIA = {
  group: 'grupos',
  roleplay: 'rol',
}

const getTime = () => {
  const t = Math.floor((Date.now() - START_TIME) / 1000)
  const d = Math.floor(t / 86400), h = Math.floor((t / 3600) % 24), min = Math.floor((t / 60) % 60), s = t % 60
  return `${d > 0 ? d + 'd ' : ''}${h > 0 ? h + 'h ' : ''}${min > 0 ? min + 'm ' : ''}${s}s`
}

function getCategorias(isOwner, groupDb) {
  const categorias = {}
  const conteos = {}
  let total = 0

  for (const p of Object.values(plugins)) {
    if (!p || !p.help) continue
    if ((p.owner || p.ownerOnly) && !isOwner) continue
    const tagRaw = Array.isArray(p.tags) ? p.tags[0] : (p.tags || 'otros')
    const tag = tagRaw.toLowerCase()
    if (groupDb?.disabledCategories?.includes(tag)) continue
    const cmdsReales = Array.isArray(p.command) ? p.command : [p.command]
    if (groupDb && cmdsReales.every(c => groupDb.disabledCmds?.includes(c))) continue

    const cmds = Array.isArray(p.help) ? p.help : [p.help]
    const cantidad = p.menuCount ?? cmds.length
    if (!categorias[tag]) categorias[tag] = []
    conteos[tag] = (conteos[tag] || 0) + cantidad
    total += cantidad
    for (const cmd of cmds) categorias[tag].push({ cmd, desc: p.desc || '' })
  }

  return { categorias, conteos, total }
}

const ALIAS_CATEGORIA = {
  info: ['info', 'informacion'],
  group: ['group', 'grupo', 'grupos'],
  tools: ['tools', 'herramientas', 'utilidades', 'utilidad'],
  descargas: ['descargas', 'descarga', 'downloads'],
  convertidores: ['convertidores', 'convertidor', 'converter'],
  stickers: ['stickers', 'sticker', 'figuritas'],
  juegos: ['juegos', 'minijuegos', 'games', 'juego'],
  economia: ['economia', 'monedas', 'coins', 'dinero', 'plata'],
  perfiles: ['perfiles', 'perfil', 'profile'],
  casino: ['casino'],
  anime: ['anime', 'gacha', 'waifu', 'waifus'],
  pokemon: ['pokemon'],
  cartas: ['cartas', 'yugioh', 'yugi'],
  roleplay: ['roleplay', 'rol', 'interaccion', 'reacciones'],
  ia: ['ia', 'ai', 'asistente', 'miku'],
  otros: ['otros', 'other'],
}

function normalizar(s) {
  return (s || '').toLowerCase().trim().normalize('NFD').replace(/[^a-z0-9]/g, '')
}

function resolverCategoriaPorNombre(nombre) {
  const n = normalizar(nombre)
  if (!n) return null
  for (const [tag, alias] of Object.entries(ALIAS_CATEGORIA)) {
    if (alias.some(a => normalizar(a) === n)) return tag
  }
  return null
}

function getOrdenActivo(isOwner, groupDb) {
  const { categorias, conteos, total } = getCategorias(isOwner, groupDb)
  const orden = ['info', 'group', 'descargas', 'convertidores', 'stickers', 'juegos', 'economia', 'perfiles', 'casino', 'anime', 'pokemon', 'cartas', 'roleplay', 'ia', 'tools', 'otros']
  const ordenFinal = orden.filter(k => categorias[k]?.length).concat(
    Object.keys(categorias).filter(k => !orden.includes(k)),
  )
  return { categorias, conteos, total, ordenFinal }
}

function parsePage(value) {
  return /^\d+$/.test(String(value || '')) && Number(value) > 0 ? Number(value) : 1
}

function resumirDescripcion(desc) {
  const text = String(desc || '').replace(/\s+/g, ' ').trim()
  return text.length > 110 ? `${text.slice(0, 107).trimEnd()}…` : text
}

function navigationFooter(prefix, tag, currentPage, pageCount) {
  const lines = []
  const categoryCommand = COMANDO_CATEGORIA[tag] || tag
  if (currentPage > 1) lines.push(`◀️ *${prefix}menu ${categoryCommand} ${currentPage - 1}*`)
  if (currentPage < pageCount) lines.push(`▶️ *${prefix}menu ${categoryCommand} ${currentPage + 1}*`)
  lines.push(`🔙 *${prefix}menu*`)
  return lines.map(line => `> ${line}`).join('\n')
}

export function buildMainMenu({ conteos, total, ordenFinal, nombreUsuario, currentBotName, prefix, uptime }) {
  const listaCategorias = ordenFinal.map(tag => {
    const nombreCat = ETIQUETAS[tag] || ETIQUETAS.otros
    const categoryCommand = COMANDO_CATEGORIA[tag] || tag
    return `> ${nombreCat} — *${conteos[tag] || 0} comandos* · escribí *${prefix}menu ${categoryCommand}*`
  }).join('\n')

  return `*┏━━•❈ 🤖 ${currentBotName} ❈•━━┓*\n\n` +
    `> 👋 *Hola, ${nombreUsuario}*\n\n` +
    `*『 📊 ESTADÍSTICAS 』*\n` +
    `▢ 👑 *Creador:* ${config.ownerName}\n` +
    `▢ ⚙️ *Prefijo:* [ *${prefix}* ]\n` +
    `▢ ⏱️ *Activo:* ${uptime}\n` +
    `▢ 📦 *Comandos:* ${total}\n\n` +
    `*『 📁 CATEGORÍAS 』*\n` +
    `${listaCategorias}\n` +
    `*┗━━━━•❅•°•❈•°•❅•━━━━┛*\n\n` +
    `💡 También podés volver con *${prefix}home* o abrir roleplay directamente con *${prefix}rol*.`
}

export function buildCategoryMenu({ tag, comandos, page = 1, prefix = '.' }) {
  const pageCount = Math.max(1, Math.ceil(comandos.length / CATEGORY_PAGE_SIZE))
  const currentPage = Math.min(Math.max(page, 1), pageCount)
  const start = (currentPage - 1) * CATEGORY_PAGE_SIZE
  const pageCommands = comandos.slice(start, start + CATEGORY_PAGE_SIZE)
  const nombreCat = ETIQUETAS[tag] || ETIQUETAS.otros

  const lines = pageCommands.map(({ cmd, desc }) => {
    const description = resumirDescripcion(desc)
    return `• *${prefix}${cmd}*${description ? `\n  ${description}` : ''}`
  }).join('\n\n')

  return `*${nombreCat.toUpperCase()} · ${currentPage}/${pageCount}*\n\n` +
    `${lines}\n\n${navigationFooter(prefix, tag, currentPage, pageCount)}`
}

export function buildRoleplayMenu(page = 1, prefix = '.') {
  const pageCount = ROLEPLAY_MENU_PAGES.length
  const currentPage = Math.min(Math.max(page, 1), pageCount)
  const data = ROLEPLAY_MENU_PAGES[currentPage - 1]
  const lines = data.actions.map(aliases =>
    `• ${aliases.map(command => `*${prefix}${command}*`).join(' / ')}`,
  ).join('\n')

  return `*${data.title.toUpperCase()}*\n` +
    `*ROLEPLAY · ${currentPage}/${pageCount} · ${ROLEPLAY_ACTION_COUNT} acciones*\n\n` +
    `${lines}\n\n` +
    `> Para interactuar: *${prefix}kill @usuario* o respondé a un mensaje.\n` +
    `> Las acciones individuales, como *${prefix}cry* o *${prefix}dance*, no necesitan mención.\n\n` +
    navigationFooter(prefix, 'roleplay', currentPage, pageCount)
}

// Los submenús son texto simple: no dependen de una imagen ni del límite de
// 1024 caracteres de los captions. La navegación por comandos funciona en
// clientes donde las listas/botones nativos no son confiables.
async function enviarSubmenu(m, tag, page, isOwner, usedPrefix, groupDb) {
  const { categorias } = getOrdenActivo(isOwner, groupDb)
  const comandos = categorias[tag]
  if (!comandos?.length) return m.reply(`*『 ❌ 』Sin comandos activos en esta categoría.*`)

  const prefix = usedPrefix || '.'
  if (tag === 'roleplay') return m.reply(buildRoleplayMenu(page, prefix))
  return m.reply(buildCategoryMenu({ tag, comandos, page, prefix }))
}

const handler = async (m, { conn, usedPrefix = '.', isOwner, command = 'menu', args = [], groupDb }) => {
  const { categorias, conteos, total, ordenFinal } = getOrdenActivo(isOwner, groupDb)
  const prefix = usedPrefix || '.'

  if (['roleplay', 'rol', 'reacciones'].includes(command)) {
    return enviarSubmenu(m, 'roleplay', parsePage(args[0]), isOwner, prefix, groupDb)
  }

  // Compatibilidad con los atajos antiguos .menu1 ... .menu20.
  const numMatch = command.match(/^menu(\d+)$/)
  if (numMatch) {
    const tag = ordenFinal[Number(numMatch[1]) - 1]
    if (tag) return enviarSubmenu(m, tag, 1, isOwner, prefix, groupDb)
    return m.reply(`*『 ❌ 』Categoría no encontrada.*`)
  }

  if (args[0] && !['home', 'inicio', 'main'].includes(normalizar(args[0]))) {
    const tag = resolverCategoriaPorNombre(args[0])
    if (tag && categorias[tag]?.length) {
      return enviarSubmenu(m, tag, parsePage(args[1]), isOwner, prefix, groupDb)
    }
    return m.reply(`*『 ❌ 』No encontré una categoría llamada "${args[0]}".*\n> Mirá las disponibles con *${prefix}menu*.`)
  }

  const textoMenu = buildMainMenu({
    conteos,
    total,
    ordenFinal,
    nombreUsuario: m.pushName || 'Usuario',
    currentBotName: conn.botname || config.botName,
    prefix,
    uptime: getTime(),
  })

  // El texto es la respuesta principal y nunca espera a la foto. El envío
  // decorativo continúa en segundo plano con sus propios errores controlados.
  await m.reply(textoMenu)
  void enviarImagenMenu(conn, m)
}

handler.help = ['menu']
handler.desc = 'Abrir el menú por categorías: .menu <categoría> [página].'
handler.tags = ['info']
handler.command = [
  'menu', 'help', 'ayuda', 'comandos', 'home', 'inicio', 'roleplay', 'rol', 'reacciones',
  ...Array.from({ length: 20 }, (_, i) => `menu${i + 1}`),
]

export default handler
