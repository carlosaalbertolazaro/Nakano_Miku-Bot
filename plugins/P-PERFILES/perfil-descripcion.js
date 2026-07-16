import UserDb from '../../lib/database/UserDb.js'

const MAX_BIO_LENGTH = 150

async function setBio(m, { text, usedPrefix }) {
  if (!text || !text.trim()) return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}setbio <texto>`)
  if (text.length > MAX_BIO_LENGTH) return m.reply(`*『 ❌ 』Máximo ${MAX_BIO_LENGTH} caracteres.*`)

  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.profile) user.data.profile = {}
  user.data.profile.bio = text.trim()
  await user.save()

  await m.reply(`*『 ✅ 』Descripción actualizada.*\n> "${text.trim()}"`)
}

async function setGenre(m, { text, usedPrefix }) {
  const valor = (text || '').trim().toLowerCase()
  const map = { hombre: 'Hombre', mujer: 'Mujer', male: 'Hombre', female: 'Mujer' }
  if (!map[valor]) return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}setgenre Hombre\n> ${usedPrefix}setgenre Mujer`)

  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.profile) user.data.profile = {}
  user.data.profile.genre = map[valor]
  await user.save()

  await m.reply(`*『 ✅ 』Género actualizado a *${map[valor]}*.`)
}

async function delGenre(m) {
  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.profile?.genre) return m.reply(`*『 ❕ 』No tenías un género configurado.*`)
  delete user.data.profile.genre
  await user.save()
  await m.reply(`*『 🗑️ 』Género eliminado.*`)
}

const handler = async (m, ctx) => {
  if (ctx.command === 'setgenre') return setGenre(m, ctx)
  if (ctx.command === 'delgenre') return delGenre(m, ctx)
  return setBio(m, ctx)
}

handler.help = ['setbio <texto>', 'setgenre Hombre|Mujer', 'delgenre']
handler.desc = 'Configurá la descripción y el género de tu perfil.'
handler.tags = ['perfiles']
handler.command = ['setbio', 'setdescription', 'setgenre', 'delgenre']

export default handler
