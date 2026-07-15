function parseFecha(str) {
  const m = (str || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const [, d, mo, y, h, mi] = m.map(Number)
  const date = new Date(y, mo - 1, d, h, mi)
  if (isNaN(date.getTime())) return null
  return date
}

async function crear(m, { conn, text, groupDb, usedPrefix, isAdmin, isOwner }) {
  if (!isAdmin && !isOwner) return m.reply(`*『 👤 』Solo un admin puede crear eventos.*`)

  const rest = text.replace(/^crear\s*/i, '')
  const [fechaStr, ...tituloParts] = rest.split('|')
  const titulo = tituloParts.join('|').trim()

  if (!fechaStr?.trim() || !titulo) {
    return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}evento crear <DD/MM/AAAA HH:MM> | <título>\n> Ejemplo: ${usedPrefix}evento crear 25/12/2026 20:00 | Noche de películas`)
  }

  const fecha = parseFecha(fechaStr)
  if (!fecha) return m.reply(`*『 ❌ 』FECHA INVÁLIDA*\n> Usá el formato DD/MM/AAAA HH:MM (ej: 25/12/2026 20:00).`)
  if (fecha.getTime() < Date.now()) return m.reply(`*『 ❌ 』Esa fecha ya pasó.*`)

  if (!groupDb.events) groupDb.events = []
  const nextId = groupDb.events.reduce((max, e) => Math.max(max, e.id), 0) + 1

  const evento = {
    id: nextId,
    title: titulo,
    timestamp: fecha.getTime(),
    createdBy: m.sender,
    attendees: [],
    reminded: false,
    done: false,
  }
  groupDb.events.push(evento)
  await groupDb.save()

  await conn.sendMessage(m.chat, {
    text: `*┏━━•❈ 📅 NUEVO EVENTO ❈•━━┓*\n\n` +
      `> *#${evento.id} — ${titulo}*\n` +
      `> 🗓️ ${fecha.toLocaleString('es', { dateStyle: 'full', timeStyle: 'short' })}\n\n` +
      `> Escribí *${usedPrefix}evento asistire ${evento.id}* para confirmar tu asistencia.\n` +
      `> Te voy a avisar por privado 30 minutos antes.\n` +
      `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`
  })
}

async function asistir(m, { args, groupDb, usedPrefix }) {
  const id = parseInt(args[1])
  const evento = (groupDb.events || []).find(e => e.id === id && !e.done)
  if (!evento) return m.reply(`*『 ❌ 』Evento no encontrado.*\n> Mirá *${usedPrefix}evento* para ver los activos.`)

  const idx = evento.attendees.indexOf(m.sender)
  if (idx === -1) {
    evento.attendees.push(m.sender)
    await groupDb.save()
    return m.reply(`*『 ✅ 』¡Confirmaste tu asistencia a "${evento.title}"!*\n> Te voy a avisar por privado 30 minutos antes.`)
  }

  evento.attendees.splice(idx, 1)
  await groupDb.save()
  return m.reply(`*『 ❌ 』Cancelaste tu asistencia a "${evento.title}".*`)
}

async function cancelar(m, { args, groupDb, isAdmin, isOwner }) {
  if (!isAdmin && !isOwner) return m.reply(`*『 👤 』Solo un admin puede cancelar eventos.*`)

  const id = parseInt(args[1])
  const events = groupDb.events || []
  const idx = events.findIndex(e => e.id === id)
  if (idx === -1) return m.reply(`*『 ❌ 』Evento no encontrado.*`)

  const [evento] = events.splice(idx, 1)
  await groupDb.save()
  return m.reply(`*『 🗑️ 』Evento "${evento.title}" cancelado.*`)
}

async function listar(m, { groupDb, usedPrefix }) {
  const activos = (groupDb.events || []).filter(e => !e.done).sort((a, b) => a.timestamp - b.timestamp)
  if (!activos.length) {
    return m.reply(`*『 📅 』SIN EVENTOS*\n> No hay eventos programados. Un admin puede crear uno con *${usedPrefix}evento crear*.`)
  }

  let txt = `*┏━━•❈ 📅 PRÓXIMOS EVENTOS ❈•━━┓*\n\n`
  for (const e of activos) {
    const fecha = new Date(e.timestamp)
    txt += `> *#${e.id} — ${e.title}*\n`
    txt += `> 🗓️ ${fecha.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}\n`
    txt += `> 👥 ${e.attendees.length} confirmados\n\n`
  }
  txt += `> Escribí *${usedPrefix}evento asistire <numero>* para confirmar.\n`
  txt += `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  await m.reply(txt)
}

const handler = async (m, ctx) => {
  const sub = (ctx.args[0] || '').toLowerCase()

  if (sub === 'crear') return crear(m, ctx)
  if (['asistire', 'asistir', 'voy'].includes(sub)) return asistir(m, ctx)
  if (sub === 'cancelar') return cancelar(m, ctx)

  return listar(m, ctx)
}

handler.help = ['evento', 'evento crear <fecha> | <titulo>', 'evento asistire <numero>', 'evento cancelar <numero>']
handler.desc = 'Calendario de eventos del grupo con confirmación de asistencia (RSVP) y recordatorio por privado.'
handler.tags = ['group']
handler.command = ['evento', 'eventos']
handler.groupOnly = true

export default handler
