import UserDb from '../../lib/database/UserDb.js'
import { RARITY_TIERS } from '../../lib/jikan.js'
import { fetchImageBuffer } from '../../lib/sendImageSafe.js'

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const idx = parseInt(args[0])
  if (!Number.isInteger(idx) || idx < 1) {
    return m.reply(`*『 ℹ️ 』USO CORRECTO*\n> ${usedPrefix}${command} <número>\n> Mirá los números con *.harem*`)
  }

  const user = await UserDb.findOrCreate(m.sender)
  const characters = user.data?.waifu?.characters || []
  const character = characters[idx - 1]

  if (!character) {
    return m.reply(`*『 ❌ 』NO ENCONTRADO*\n> No tenés ningún personaje en la posición *${idx}*. Mirá *.harem* para ver los números válidos.`)
  }

  const label = RARITY_TIERS[character.rarity]?.label || character.rarity
  const fecha = new Date(character.claimedAt).toLocaleDateString('es')

  const caption = `*『 ✨ 』${character.name}*\n\n` +
    `> 📺 Serie: ${character.series}\n` +
    `> ${label}\n` +
    `> 💖 ${character.favorites} favoritos en MAL\n` +
    `> 📅 Reclamado: ${fecha}\n` +
    (character.malId ? `> 🔗 https://myanimelist.net/character/${character.malId}\n` : '')

  try {
    const buffer = character.image ? await fetchImageBuffer(character.image) : null
    if (buffer) {
      await conn.sendMessage(m.chat, { image: buffer, caption }, { quoted: m })
    } else {
      await m.reply(caption)
    }
  } catch {
    await m.reply(caption)
  }
}

handler.help = ['charinfo <numero>']
handler.desc = 'Ver la ficha de un personaje reclamado (serie, rareza, imagen).'
handler.tags = ['anime']
handler.command = ['charinfo', 'infowaifu', 'verpersonaje']

export default handler
