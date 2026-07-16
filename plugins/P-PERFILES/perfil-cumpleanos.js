import * as baileysMod from '@whiskeysockets/baileys'
import UserDb, { getBirthdays } from '../../lib/database/UserDb.js'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { jidNormalizedUser } = pkg

function resolveJid(p) {
  if (p.phoneNumber) {
    const num = p.phoneNumber
    return jidNormalizedUser(num.includes('@') ? num : `${num}@s.whatsapp.net`)
  }
  if (!p.id.endsWith('@lid')) return jidNormalizedUser(p.id)
  return null
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function parseFecha(str) {
  const m = (str || '').trim().match(/^(\d{1,2})[/-](\d{1,2})$/)
  if (!m) return null
  const day = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  if (month < 1 || month > 12) return null
  const diasEnMes = new Date(2024, month, 0).getDate() // 2024 es bisiesto, cubre 29/feb
  if (day < 1 || day > diasEnMes) return null
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatFecha(mmdd) {
  const [month, day] = mmdd.split('-').map(Number)
  return `${day} de ${MESES[month - 1]}`
}

function diasHastaProximo(mmdd) {
  const [month, day] = mmdd.split('-').map(Number)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  let proximo = new Date(hoy.getFullYear(), month - 1, day)
  if (proximo < hoy) proximo = new Date(hoy.getFullYear() + 1, month - 1, day)
  return Math.round((proximo - hoy) / 86400000)
}

async function setBirth(m, { args, usedPrefix }) {
  const mmdd = parseFecha(args[0])
  if (!mmdd) return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}setbirth DD/MM\n> Ejemplo: ${usedPrefix}setbirth 25/12`)

  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.profile) user.data.profile = {}
  user.data.profile.birthday = mmdd
  await user.save()

  await m.reply(`*『 🎂 』¡Listo!*\n> Guardé tu cumpleaños: *${formatFecha(mmdd)}*.`)
}

async function delBirth(m) {
  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.profile?.birthday) return m.reply(`*『 ❕ 』No tenías un cumpleaños guardado.*`)

  delete user.data.profile.birthday
  await user.save()
  await m.reply(`*『 🗑️ 』Borré tu fecha de cumpleaños.*`)
}

async function listar(m, { participants, usedPrefix }, soloProximos) {
  if (!m.isGroup) return m.reply(`*『 👥 』SOLO GRUPOS.*`)

  const jids = participants.map(resolveJid).filter(Boolean)
  const registros = await getBirthdays(jids)

  if (!registros.length) {
    return m.reply(`*『 🎂 』SIN CUMPLEAÑOS*\n> Nadie en el grupo configuró su fecha todavía. Usá *${usedPrefix}setbirth DD/MM*.`)
  }

  const conDias = registros.map(r => ({ ...r, dias: diasHastaProximo(r.birthday) }))
  const filtrados = soloProximos ? conDias.filter(r => r.dias <= 30).sort((a, b) => a.dias - b.dias) : conDias.sort((a, b) => a.dias - b.dias)

  if (!filtrados.length) {
    return m.reply(`*『 🎂 』Nadie tiene cumpleaños en los próximos 30 días.*`)
  }

  const titulo = soloProximos ? 'PRÓXIMOS CUMPLEAÑOS' : 'TODOS LOS CUMPLEAÑOS'
  let txt = `*┏━━•❈ 🎂 ${titulo} ❈•━━┓*\n\n`
  const mentions = []
  for (const r of filtrados) {
    mentions.push(r.jid)
    const faltan = r.dias === 0 ? '¡HOY! 🎉' : `en ${r.dias} día${r.dias === 1 ? '' : 's'}`
    txt += `> 🎈 @${r.jid.split('@')[0]} — ${formatFecha(r.birthday)} (${faltan})\n`
  }
  txt += `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  await m.reply(txt, { mentions })
}

const handler = async (m, ctx) => {
  if (ctx.command === 'setbirth') return setBirth(m, ctx)
  if (ctx.command === 'delbirth') return delBirth(m)
  if (ctx.command === 'allbirthdays' || ctx.command === 'allbirths') return listar(m, ctx, false)
  return listar(m, ctx, true)
}

handler.help = ['setbirth DD/MM', 'delbirth', 'birthdays', 'allbirthdays']
handler.desc = 'Guardá tu cumpleaños y mirá los próximos (o todos) los cumpleaños del grupo.'
handler.tags = ['perfiles']
handler.command = ['setbirth', 'delbirth', 'birthdays', 'cumpleanos', 'cumpleaños', 'births', 'allbirthdays', 'allbirths']

export default handler
