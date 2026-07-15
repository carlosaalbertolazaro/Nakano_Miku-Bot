import { searchAnimeByName } from '../../lib/anilist.js'

async function seguir(m, { text, groupDb, usedPrefix }) {
  const nombre = text.replace(/^seguir\s*/i, '').trim()
  if (!nombre) {
    return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}airing seguir <nombre del anime>\n> Ejemplo: ${usedPrefix}airing seguir One Piece`)
  }

  let info
  try {
    info = await searchAnimeByName(nombre)
  } catch (e) {
    return m.reply(`*『 ❌ 』ERROR*\n> ${e.message}`)
  }

  if (!info.nextEpisode) {
    return m.reply(`*『 ❕ 』"${info.title}" no tiene un próximo episodio programado ahora mismo* (puede que ya haya terminado, o que todavía no tenga fecha de estreno).`)
  }

  if (!groupDb.followedAnime) groupDb.followedAnime = []
  if (groupDb.followedAnime.some(a => a.id === info.id)) {
    return m.reply(`*『 ❕ 』Este grupo ya está siguiendo "${info.title}".*`)
  }

  groupDb.followedAnime.push({ id: info.id, title: info.title, lastKnownEpisode: info.nextEpisode, addedBy: m.sender })
  await groupDb.save()

  const fecha = new Date(info.airingAt * 1000)
  await m.reply(
    `*『 ✅ 』Siguiendo "${info.title}"*\n` +
    `> Próximo episodio: *${info.nextEpisode}*\n` +
    `> Sale: ${fecha.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}\n` +
    `> Te avisamos en este grupo apenas salga.`
  )
}

async function dejar(m, { text, groupDb, usedPrefix }) {
  const nombre = text.replace(/^dejar\s*/i, '').trim().toLowerCase()
  if (!nombre) return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}airing dejar <nombre>`)

  const lista = groupDb.followedAnime || []
  const idx = lista.findIndex(a => a.title.toLowerCase().includes(nombre))
  if (idx === -1) return m.reply(`*『 ❌ 』No estás siguiendo ningún anime que coincida con "${nombre}".*`)

  const [removido] = lista.splice(idx, 1)
  await groupDb.save()
  await m.reply(`*『 🗑️ 』Dejaste de seguir "${removido.title}".*`)
}

async function listar(m, { groupDb, usedPrefix }) {
  const lista = groupDb.followedAnime || []
  if (!lista.length) {
    return m.reply(`*『 📺 』SIN ANIMES SEGUIDOS*\n> Seguí uno con *${usedPrefix}airing seguir <nombre>*.`)
  }

  let txt = `*┏━━•❈ 📺 ANIMES SEGUIDOS ❈•━━┓*\n\n`
  for (const a of lista) txt += `> *${a.title}* — próximo: ep. ${a.lastKnownEpisode}\n`
  txt += `\n> ${usedPrefix}airing dejar <nombre>\n`
  txt += `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  await m.reply(txt)
}

const handler = async (m, ctx) => {
  if (!m.isGroup) return m.reply(`*『 👥 』SOLO GRUPOS.*\n> Seguir animes solo funciona en grupos.`)

  const sub = (ctx.args[0] || '').toLowerCase()
  if (sub === 'seguir') return seguir(m, ctx)
  if (sub === 'dejar') return dejar(m, ctx)

  return listar(m, ctx)
}

handler.help = ['airing', 'airing seguir <nombre>', 'airing dejar <nombre>']
handler.desc = 'Seguí un anime y el grupo recibe un aviso automático apenas sale un episodio nuevo (vía AniList).'
handler.tags = ['anime']
handler.command = ['airing', 'estreno', 'estrenos']
handler.groupOnly = true

export default handler
