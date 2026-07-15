import { searchAnimeByImage, formatTimestamp } from '../../lib/tracemoe.js'

const handler = async (m, { usedPrefix }) => {
  const q = m.quoted ? m.quoted : m
  const mime = (q.msg || q).mimetype || ''
  const esImg = q.mtype === 'imageMessage' || /image/i.test(mime)

  if (!esImg) {
    return m.reply(`*『 ✙ 』SIN IMAGEN.*\n> Enviá o respondé a una imagen (screenshot de un anime) con *${usedPrefix}salsa*.`)
  }

  await m.reply(`*『 🔍 』Buscando de qué anime es esta escena...*`)

  try {
    const buffer = await q.download()
    if (!buffer) throw new Error('No se pudo descargar la imagen.')

    const r = await searchAnimeByImage(buffer)
    const title = r.anilist?.title?.spanish || r.anilist?.title?.english || r.anilist?.title?.romaji || 'Desconocido'
    const porcentaje = (r.similarity * 100).toFixed(1)

    let txt = `*┏━━•❈ 🌸 SALSA (ANIME) ❈•━━┓*\n\n`
    txt += `> *${title}*\n`
    if (r.anilist?.title?.native) txt += `> 🇯🇵 ${r.anilist.title.native}\n`
    if (r.episode != null) txt += `> 📺 Episodio ${r.episode}\n`
    txt += `> ⏱️ ${formatTimestamp(r.from)} - ${formatTimestamp(r.to)}\n`
    txt += `> 🎯 Coincidencia: ${porcentaje}%\n`
    if (r.anilist?.siteUrl) txt += `> 🔗 ${r.anilist.siteUrl}\n`
    txt += `> 📊 Búsquedas restantes hoy: ${r.quota - r.quotaUsed}/${r.quota}\n`
    txt += `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

    if (porcentaje < 80) {
      txt += `\n\n> ⚠️ La coincidencia es baja, puede que no sea correcto.`
    }

    await m.reply(txt)
  } catch (e) {
    await m.reply(`*『 ❌ 』ERROR*\n> ${e.message}`)
  }
}

handler.help = ['salsa (respondiendo a una imagen)']
handler.desc = 'Identifica de qué anime es una escena/imagen (screenshot) y en qué episodio/minuto aparece.'
handler.tags = ['anime']
handler.command = ['salsa', 'whatanime', 'traceanime']

export default handler
