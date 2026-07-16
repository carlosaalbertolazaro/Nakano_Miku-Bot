import { groupDbCache } from '../../lib/caches.js'

const ETIQUETAS = ['info', 'group', 'tools', 'descargas', 'convertidores', 'stickers', 'juegos', 'economia', 'perfiles', 'casino', 'anime', 'pokemon', 'cartas', 'roleplay', 'ia', 'fun', 'otros']

const handler = async (m, { args, usedPrefix, command, groupDb }) => {
  const isEnable = command === 'enable' || command === 'activar'
  const target = args[0]?.toLowerCase()

  if (!target) return m.reply(`*『 ℹ️ 』USO:*\n> ${usedPrefix}${command} <comando | categoria>\n> Ejemplo: ${usedPrefix}${command} descargas`)

  if (!groupDb.disabledCategories) groupDb.disabledCategories = []
  if (!groupDb.disabledCmds) groupDb.disabledCmds = []

  if (ETIQUETAS.includes(target)) {
    if (isEnable) {
      groupDb.disabledCategories = groupDb.disabledCategories.filter(c => c !== target)
    } else {
      if (!groupDb.disabledCategories.includes(target)) groupDb.disabledCategories.push(target)
    }
  } else {
    if (isEnable) {
      groupDb.disabledCmds = groupDb.disabledCmds.filter(c => c !== target)
    } else {
      if (!groupDb.disabledCmds.includes(target)) groupDb.disabledCmds.push(target)
    }
  }

  groupDb.save()
  groupDbCache.set(m.chat, groupDb)
  m.reply(`*『 ✅ 』ÉXITO*\n> ${target.toUpperCase()} fue ${isEnable ? 'habilitado' : 'deshabilitado'} en este grupo.`)
}

handler.help = ['disable <cmd/cat>', 'enable <cmd/cat>']
handler.desc = 'Desactivar/activar un comando o una categoría entera en este grupo.'
handler.tags = ['group']
handler.command = ['disable', 'desactivar', 'enable', 'activar']
handler.adminOnly = true
handler.groupOnly = true

export default handler
