import { jidNormalizedUser } from '@whiskeysockets/baileys'
import UserDb from '../../lib/database/UserDb.js'

function targetFrom(m) {
  const jid = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null)
  return jid ? jidNormalizedUser(jid) : null
}

async function regalarUno(m, { args, usedPrefix }) {
  const target = targetFrom(m)
  const idx = parseInt(args.find(a => /^\d+$/.test(a)))

  if (!target || !Number.isInteger(idx) || idx < 1) {
    return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}givechar @usuario <número>\n> Mirá los números con *.harem*.`)
  }
  if (target === jidNormalizedUser(m.sender)) return m.reply(`*『 ❌ 』No podés regalarte un personaje a vos mismo.*`)

  const sender = await UserDb.findOrCreate(m.sender)
  const characters = sender.data?.waifu?.characters || []
  const character = characters[idx - 1]
  if (!character) return m.reply(`*『 ❌ 』No tenés ningún personaje en la posición *${idx}*.`)

  characters.splice(idx - 1, 1)
  await sender.save()

  const receiver = await UserDb.findOrCreate(target)
  if (!receiver.data.waifu) receiver.data.waifu = { characters: [] }
  if (!receiver.data.waifu.characters) receiver.data.waifu.characters = []
  receiver.data.waifu.characters.push(character)
  await receiver.save()

  await m.reply(`*『 🎁 』Le regalaste a *${character.name}* a @${target.split('@')[0]}.*`, { mentions: [target] })
}

async function regalarTodo(m) {
  const target = targetFrom(m)
  if (!target) return m.reply(`*『 ℹ️ 』Mencioná a quién le regalás todo tu harem.*`)
  if (target === jidNormalizedUser(m.sender)) return m.reply(`*『 ❌ 』No podés regalarte tu harem a vos mismo.*`)

  const sender = await UserDb.findOrCreate(m.sender)
  const characters = sender.data?.waifu?.characters || []
  if (!characters.length) return m.reply(`*『 ❌ 』No tenés ningún personaje para regalar.*`)

  const receiver = await UserDb.findOrCreate(target)
  if (!receiver.data.waifu) receiver.data.waifu = { characters: [] }
  if (!receiver.data.waifu.characters) receiver.data.waifu.characters = []
  receiver.data.waifu.characters.push(...characters)
  sender.data.waifu.characters = []

  await sender.save()
  await receiver.save()

  await m.reply(`*『 🎁 』Le regalaste todo tu harem (${characters.length} personajes) a @${target.split('@')[0]}.*`, { mentions: [target] })
}

const handler = async (m, ctx) => {
  if (ctx.command === 'giveallharem') return regalarTodo(m, ctx)
  return regalarUno(m, ctx)
}

handler.help = ['givechar @usuario <numero>', 'giveallharem @usuario']
handler.desc = 'Regalá un personaje (o todo tu harem) a otro usuario, sin cobrar nada.'
handler.tags = ['anime']
handler.command = ['givechar', 'givewaifu', 'regalar', 'giveallharem']
handler.groupOnly = true

export default handler
