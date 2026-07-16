import UserDb from '../../lib/database/UserDb.js'
import { isPerkActive, activatePerk } from '../../lib/economy.js'
import { gachaCooldownCache } from '../../lib/caches.js'

// Tienda de perks reales (no cosméticos) — nace de un pedido concreto de
// Carlos: las monedas necesitaban algo en qué gastarse más allá del casino
// y el gacha. Cada ítem soluciona un problema real de otro módulo del bot.
const ITEMS = {
  boost: {
    nombre: 'Boost de XP (2h)',
    precio: 300,
    perk: 'xpBoost',
    duracionMs: 2 * 60 * 60 * 1000,
    desc: 'Duplica el XP que ganás por chatear durante 2 horas.',
  },
  seguro: {
    nombre: 'Seguro anti-robo (24h)',
    precio: 250,
    perk: 'stealShield',
    duracionMs: 24 * 60 * 60 * 1000,
    desc: 'Nadie te puede robar con .steal durante 24 horas.',
  },
  resetgacha: {
    nombre: 'Reset de cooldown de gacha',
    precio: 150,
    instant: true,
    desc: 'Te saca el enfriamiento de .gacha al instante, para tirar de nuevo ya mismo.',
  },
}

async function listar(m, { usedPrefix }) {
  let txt = `*┏━━•❈ 🛍️ TIENDA ❈•━━┓*\n\n`
  for (const [key, item] of Object.entries(ITEMS)) {
    txt += `> *${item.nombre}* — ${item.precio} monedas\n> ${item.desc}\n> Comprar: *${usedPrefix}shop comprar ${key}*\n\n`
  }
  txt += `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`
  await m.reply(txt)
}

async function comprar(m, { args, usedPrefix }) {
  const key = (args[1] || '').toLowerCase()
  const item = ITEMS[key]
  if (!item) return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}shop comprar <item>\n> Mirá los nombres con *${usedPrefix}shop*.`)

  const user = await UserDb.findOrCreate(m.sender)
  if (user.coins < item.precio) {
    return m.reply(`*『 ❌ 』SALDO INSUFICIENTE*\n> Necesitás *${item.precio}* monedas, tenés *${user.coins}*.`)
  }

  if (item.instant) {
    gachaCooldownCache.del(m.sender)
    user.coins -= item.precio
    await user.save()
    return m.reply(`*『 ✅ 』¡Listo! Ya podés usar *.gacha* de nuevo.*\n> Balance: *${user.coins}*`)
  }

  if (isPerkActive(user, item.perk)) {
    return m.reply(`*『 ❕ 』Ya tenés ese perk activo — esperá a que se termine antes de comprarlo de nuevo.*`)
  }

  user.coins -= item.precio
  activatePerk(user, item.perk, item.duracionMs)
  await user.save()

  const horas = Math.round(item.duracionMs / 3600000)
  await m.reply(`*『 ✅ 』¡Comprado! *${item.nombre}* activo por ${horas}h.*\n> Balance: *${user.coins}*`)
}

const handler = async (m, ctx) => {
  if ((ctx.args[0] || '').toLowerCase() === 'comprar') return comprar(m, ctx)
  return listar(m, ctx)
}

handler.help = ['shop', 'shop comprar <item>']
handler.desc = 'Tienda de perks reales: boost de XP, seguro anti-robo, o resetear el cooldown del gacha.'
handler.tags = ['economia']
handler.command = ['shop', 'tienda']

export default handler
