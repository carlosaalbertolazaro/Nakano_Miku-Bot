// Respaldo de lib/jikan.js: AniList (graphql.anilist.co), pública y
// gratuita, sin API key. Verificado en vivo — mucho más estable que Jikan
// en la práctica (Jikan depende de scrapear MyAnimeList y se cae seguido,
// AniList tiene su propia base de datos). El "Page" de personajes está
// acotado a 5000 resultados (límite del propio índice de búsqueda de
// AniList), suficiente variedad para un gacha.

import { fetchJsonWithRetry } from './httpJson.js'
import { calcRarity } from './animeRarity.js'

const MAX_PAGE = 5000

const QUERY = `
query ($page: Int) {
  Page(page: $page, perPage: 1) {
    characters(sort: FAVOURITES_DESC) {
      id
      name { full }
      image { large }
      favourites
      media(perPage: 1) { nodes { title { romaji english } } }
      siteUrl
    }
  }
}`

export async function fetchRandomCharacterFromAniList() {
  const page = Math.floor(Math.random() * MAX_PAGE) + 1

  const json = await fetchJsonWithRetry('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { page } }),
    retries: 1,
    timeoutMs: 8000,
  })

  const data = json?.data?.Page?.characters?.[0]
  if (!data || !data.name?.full) throw new Error('AniList no devolvió ningún personaje.')

  const favorites = Number(data.favourites) || 0
  const media = data.media?.nodes?.[0]?.title

  return {
    malId: data.id, // id de AniList, no de MAL — se guarda igual para tener un link/identificador único
    name: data.name.full,
    series: media?.english || media?.romaji || 'Serie desconocida',
    image: data.image?.large || null,
    favorites,
    rarity: calcRarity(favorites),
    url: data.siteUrl || null,
  }
}
