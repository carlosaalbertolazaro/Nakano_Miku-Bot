import { jidNormalizedUser } from '@whiskeysockets/baileys'
import UserDb from '../../lib/database/UserDb.js'

const handler = async (m, { args, usedPrefix, command }) => {
  const targetJid = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null)
  const amountArg = args.find(a => /^\d+$/.test(a))
  const amount = amountArg ? parseInt(amountArg, 10) : NaN

  if (!targetJid || !Number.isInteger(amount) || amount <= 0) {
    return m.reply(`*『 ℹ️ 』USO CORRECTO*\n> ${usedPrefix}${command} @usuario <cantidad>\n> Ejemplo: ${usedPrefix}${command} @user 100`)
  }

  const target = jidNormalizedUser(targetJid)
  if (target === jidNormalizedUser(m.sender)) {
    return m.reply(`*『 ❌ 』No podés transferirte monedas a vos mismo.*`)
  }

  const sender = await UserDb.findOrCreate(m.sender)
  if (sender.coins < amount) {
    return m.reply(`*『 ❌ 』SALDO INSUFICIENTE*\n> Tenés *${sender.coins}* monedas, necesitás *${amount}*.`)
  }

  const receiver = await UserDb.findOrCreate(target)
  sender.coins -= amount
  receiver.coins += amount
  await sender.save()
  await receiver.save()

  await m.reply(
    `*『 💸 』TRANSFERENCIA EXITOSA*\n> @${m.sender.split('@')[0]} le envió *${amount} monedas* a @${target.split('@')[0]}`,
    { mentions: [m.sender, target] }
  )
}

handler.help = ['pay @user <cantidad>']
handler.desc = 'Transferí monedas de tu balance a otro usuario.'
handler.tags = ['economia']
handler.command = ['pay', 'dar', 'transferir']
handler.groupOnly = false

export default handler
