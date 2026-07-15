const MODULOS = {
  waifu:   { label: '🌸 Waifu Gacha (anime)', aliases: ['waifu', 'anime', 'gacha'] },
  pokemon: { label: '🐾 Pokémon salvajes',    aliases: ['pokemon', 'poke', 'pokémon'] },
  cards:   { label: '🃏 Cartas (Yu-Gi-Oh)',   aliases: ['cards', 'cartas', 'ygo'] },
}

function resolveModule(input) {
  const norm = (input || '').toLowerCase()
  const found = Object.entries(MODULOS).find(([key, def]) => key === norm || def.aliases.includes(norm))
  return found?.[0] || null
}

const handler = async (m, { args, groupDb, usedPrefix, command }) => {
  if (!groupDb.modules) groupDb.modules = { waifu: true, pokemon: true, cards: true }

  if (args.length === 0) {
    let txt = `*『 🎛️ 』MÓDULOS DE ESTE GRUPO*\n\n`
    for (const [key, def] of Object.entries(MODULOS)) {
      const on = groupDb.modules[key] !== false
      txt += `> ${def.label}: ${on ? '✅ Activado' : '❌ Desactivado'}\n`
    }
    txt += `\n> 💡 *Uso:* ${usedPrefix}${command} <modulo> <on/off>\n> *Ejemplo:* ${usedPrefix}${command} pokemon off`
    return m.reply(txt)
  }

  const key = resolveModule(args[0])
  if (!key) {
    return m.reply(`*『 ❌ 』MÓDULO DESCONOCIDO*\n> Opciones válidas: ${Object.keys(MODULOS).join(', ')}`)
  }

  const estadoArg = (args[1] || '').toLowerCase()
  if (!['on', 'off', '1', '0', 'activar', 'desactivar'].includes(estadoArg)) {
    return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}${command} ${key} <on/off>`)
  }

  const activar = ['on', '1', 'activar'].includes(estadoArg)
  groupDb.modules[key] = activar
  await groupDb.save()

  await m.reply(`*『 ${activar ? '✅' : '❌'} 』${MODULOS[key].label}* fue ${activar ? 'activado' : 'desactivado'} en este grupo.`)
}

handler.help = ['modulos', 'modulos <pokemon|waifu|cards> <on/off>']
handler.desc = 'Activar/desactivar por separado el gacha de waifus, los Pokémon salvajes o las cartas en este grupo.'
handler.tags = ['group']
handler.command = ['modulos', 'modules', 'toggle']
handler.groupOnly = true
handler.adminOnly = true

export default handler
