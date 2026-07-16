import UserDb from '../../lib/database/UserDb.js'

async function setMeta(m, { text, usedPrefix }) {
  const [autor, pack] = (text || '').split('|').map(s => s?.trim())
  if (!autor || !pack) {
    return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}setstickermeta <autor> | <pack>\n> Ejemplo: ${usedPrefix}setstickermeta Carlos | Mi Pack`)
  }

  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.stickers) user.data.stickers = {}
  user.data.stickers.author = autor
  user.data.stickers.packname = pack
  await user.save()

  await m.reply(`*『 ✅ 』Listo.*\n> Tus próximos stickers (.sticker) van a decir:\n> Pack: *${pack}*\n> Autor: *${autor}*`)
}

async function delMeta(m) {
  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.stickers) {
    return m.reply(`*『 ❕ 』No tenías un pack/autor personalizado configurado.*`)
  }
  delete user.data.stickers
  await user.save()
  await m.reply(`*『 🗑️ 』Restablecido al pack/autor por defecto del bot.*`)
}

const handler = async (m, ctx) => {
  if (ctx.command === 'delstickermeta' || ctx.command === 'delmeta') return delMeta(m, ctx)
  return setMeta(m, ctx)
}

handler.help = ['setstickermeta <autor> | <pack>', 'delstickermeta']
handler.desc = 'Personalizá el nombre de pack y autor que se guardan en los stickers que creás con .sticker.'
handler.tags = ['stickers']
handler.command = ['setstickermeta', 'setmeta', 'delstickermeta', 'delmeta']

export default handler
