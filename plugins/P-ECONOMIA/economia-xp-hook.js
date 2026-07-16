import UserDb from '../../lib/database/UserDb.js'
import { grantXp, randomXpGain, isPerkActive } from '../../lib/economy.js'
import { xpCooldownCache } from '../../lib/caches.js'

// Sin .command a propósito: este plugin no responde a ningún comando, solo
// escucha CADA mensaje de grupo (vía handler.all) para otorgar XP por chatear,
// con un cooldown de 60s por usuario/grupo para evitar farmeo por spam.
const handler = {}

handler.all = async function (m, { conn }) {
  if (!m.isGroup || !m.sender || m.isBaileys || m.fromMe) return
  if (!m.message) return

  const cooldownKey = `${m.chat}:${m.sender}`
  if (xpCooldownCache.has(cooldownKey)) return
  xpCooldownCache.set(cooldownKey, true)

  const user = await UserDb.findOrCreate(m.sender)
  const amount = randomXpGain() * (isPerkActive(user, 'xpBoost') ? 2 : 1)
  const result = grantXp(user, amount)
  await user.save()

  if (result.leveledUp) {
    try {
      await conn.sendMessage(m.chat, {
        text: `*『 🎉 』¡SUBISTE DE NIVEL!*\n> @${m.sender.split('@')[0]} alcanzó el *nivel ${result.newLevel}* ✨\n> 💰 Bonus: +${result.coinBonus} monedas`,
        mentions: [m.sender]
      }, { quoted: m })
    } catch {}
  }
}

handler.tags = ['economia']
handler.noRegister = true

export default handler
