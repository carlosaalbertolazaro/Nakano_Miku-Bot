import { jidNormalizedUser } from '@whiskeysockets/baileys'
import UserDb from '../../lib/database/UserDb.js'

const COOLDOWN_MS = 60 * 60 * 1000 // 1h por ladrón
const SUCCESS_RATE = 0.4
const MIN_TARGET_WALLET = 100 // no vale la pena robarle a alguien casi sin monedas
const STEAL_PCT = 0.25 // hasta 25% de la billetera de la víctima (nunca del banco)
const FINE_PCT = 0.15 // si falla, pierde ese % de SU PROPIA billetera

const handler = async (m, { usedPrefix }) => {
  const targetJid = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null)
  if (!targetJid) return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}steal @usuario`)

  const target = jidNormalizedUser(targetJid)
  const senderJid = jidNormalizedUser(m.sender)
  if (target === senderJid) return m.reply(`*『 ❌ 』No podés robarte a vos mismo.*`)

  const thief = await UserDb.findOrCreate(m.sender)
  if (!thief.data.economy) thief.data.economy = {}

  const last = thief.data.economy.lastSteal || 0
  const now = Date.now()
  const elapsed = now - last
  if (elapsed < COOLDOWN_MS) {
    const remaining = COOLDOWN_MS - elapsed
    const min = Math.ceil(remaining / 60000)
    return m.reply(`*『 🕵️ 』MUY SOSPECHOSO*\n> Esperá *${min} minutos* antes de intentar robar de nuevo.`)
  }

  const victim = await UserDb.findOrCreate(target)
  if (victim.coins < MIN_TARGET_WALLET) {
    return m.reply(`*『 ❌ 』@${target.split('@')[0]} no tiene suficiente plata en la billetera para que valga la pena.*`, { mentions: [target] })
  }

  thief.data.economy.lastSteal = now

  if (Math.random() < SUCCESS_RATE) {
    const stolen = Math.floor(victim.coins * STEAL_PCT)
    victim.coins -= stolen
    thief.coins += stolen
    await victim.save()
    await thief.save()
    return m.reply(
      `*『 🥷 』ROBO EXITOSO*\n> Le robaste *${stolen} monedas* a @${target.split('@')[0]}.\n> Tu billetera: *${thief.coins}*`,
      { mentions: [target] }
    )
  }

  const fine = Math.floor(thief.coins * FINE_PCT)
  thief.coins -= fine
  await thief.save()
  return m.reply(`*『 🚨 』TE ATRAPARON*\n> @${target.split('@')[0]} se dio cuenta y tuviste que pagar *${fine} monedas* de multa.`, { mentions: [target] })
}

handler.help = ['steal @usuario']
handler.desc = 'Intentá robarle monedas de la billetera a otro usuario (no puede tocar lo que tiene guardado en el banco).'
handler.tags = ['economia']
handler.command = ['steal', 'robar', 'rob']
handler.groupOnly = true

export default handler
