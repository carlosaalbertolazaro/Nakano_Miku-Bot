import UserDb from '../../lib/database/UserDb.js'

// El banco (user.data.economy.bank) guarda monedas a salvo de .steal, que
// solo puede robar de la billetera (user.coins). Mismo namespace que
// economia-daily.js/economia-work.js (user.data.economy.*).
function parseAmount(arg, max) {
  if (!arg) return null
  if (arg.toLowerCase() === 'all' || arg.toLowerCase() === 'todo') return max
  const n = parseInt(arg, 10)
  return Number.isInteger(n) && n > 0 ? n : null
}

async function depositar(m, { args, usedPrefix }) {
  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.economy) user.data.economy = {}
  if (typeof user.data.economy.bank !== 'number') user.data.economy.bank = 0

  const amount = parseAmount(args[0], user.coins)
  if (!amount || amount > user.coins) {
    return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}deposit <cantidad|all>\n> Billetera: *${user.coins}* monedas.`)
  }

  user.coins -= amount
  user.data.economy.bank += amount
  await user.save()

  await m.reply(`*『 🏦 』DEPÓSITO REALIZADO*\n> Guardaste *${amount}* monedas en el banco.\n> Billetera: *${user.coins}* · Banco: *${user.data.economy.bank}*`)
}

async function retirar(m, { args, usedPrefix }) {
  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.economy) user.data.economy = {}
  if (typeof user.data.economy.bank !== 'number') user.data.economy.bank = 0

  const amount = parseAmount(args[0], user.data.economy.bank)
  if (!amount || amount > user.data.economy.bank) {
    return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}withdraw <cantidad|all>\n> Banco: *${user.data.economy.bank}* monedas.`)
  }

  user.data.economy.bank -= amount
  user.coins += amount
  await user.save()

  await m.reply(`*『 💳 』RETIRO REALIZADO*\n> Sacaste *${amount}* monedas del banco.\n> Billetera: *${user.coins}* · Banco: *${user.data.economy.bank}*`)
}

const handler = async (m, ctx) => {
  if (['deposit', 'dep', 'depositar'].includes(ctx.command)) return depositar(m, ctx)
  return retirar(m, ctx)
}

handler.help = ['deposit <cantidad|all>', 'withdraw <cantidad|all>']
handler.desc = 'Guardá monedas en el banco (a salvo de robos) o retiralas de vuelta a tu billetera.'
handler.tags = ['economia']
handler.command = ['deposit', 'dep', 'depositar', 'withdraw', 'with', 'retirar']

export default handler
