import { fetchFreeGames } from '../../lib/freetogame.js'

const handler = async (m, { args, usedPrefix }) => {
  const categoria = (args[0] || '').toLowerCase().trim()

  let games
  try {
    games = await fetchFreeGames({ category: categoria || null })
  } catch (e) {
    return m.reply(
      `*『 ❌ 』ERROR*\n> ${e.message}\n` +
      `> Ejemplos de categoría: mmorpg, shooter, moba, battle-royale, card, fantasy, anime, horror.`
    )
  }

  const top = games.slice(0, 8)
  let txt = `*┏━━•❈ 🎮 JUEGOS GRATIS ${categoria ? `(${categoria})` : ''} ❈•━━┓*\n\n`
  for (const g of top) {
    txt += `> *${g.title}*\n`
    txt += `> 🏷️ ${g.genre} · 🖥️ ${g.platform}\n`
    txt += `> 🔗 ${g.game_url}\n\n`
  }
  txt += `> Mostrando ${top.length}/${games.length} resultados.\n`
  if (!categoria) txt += `> Filtrá por categoría: ${usedPrefix}freegames <categoria>\n`
  txt += `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  await m.reply(txt)
}

handler.help = ['freegames [categoria]']
handler.desc = 'Lista juegos free-to-play populares (PC y navegador). Filtrable por categoría (mmorpg, shooter, moba, etc).'
handler.tags = ['juegos']
handler.command = ['freegames', 'juegosgratis']

export default handler
