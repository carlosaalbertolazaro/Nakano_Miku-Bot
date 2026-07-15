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

// Búsqueda de un anime por nombre para .airing seguir — verificado en vivo:
// Media(search, type:ANIME) devuelve nextAiringEpisode{episode,airingAt}
// (null si terminó/no tiene fecha), justo lo que hace falta para el aviso
// de "salió el episodio nuevo".
const SEARCH_QUERY = `
query ($search: String) {
  Media(search: $search, type: ANIME) {
    id
    title { romaji english }
    status
    nextAiringEpisode { episode airingAt }
    siteUrl
    coverImage { large }
  }
}`

export async function searchAnimeByName(name) {
  const json = await fetchJsonWithRetry('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: SEARCH_QUERY, variables: { search: name } }),
    retries: 1,
    timeoutMs: 8000,
  })

  const m = json?.data?.Media
  if (!m) throw new Error(`No se encontró ningún anime llamado "${name}".`)

  return {
    id: m.id,
    title: m.title?.english || m.title?.romaji || 'Sin título',
    status: m.status,
    nextEpisode: m.nextAiringEpisode?.episode ?? null,
    airingAt: m.nextAiringEpisode?.airingAt ?? null,
    url: m.siteUrl || null,
    image: m.coverImage?.large || null,
  }
}

// Chequeo en lote (id_in) para el scheduler — un solo request por más que
// haya varios animes seguidos en varios grupos distintos.
const BATCH_QUERY = `
query ($ids: [Int]) {
  Page(page: 1, perPage: 50) {
    media(id_in: $ids, type: ANIME) {
      id
      status
      nextAiringEpisode { episode airingAt }
    }
  }
}`

export async function fetchAiringInfoBatch(ids) {
  if (!ids.length) return []

  const json = await fetchJsonWithRetry('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: BATCH_QUERY, variables: { ids } }),
    retries: 1,
    timeoutMs: 10000,
  })

  const list = json?.data?.Page?.media || []
  return list.map(m => ({
    id: m.id,
    status: m.status,
    nextEpisode: m.nextAiringEpisode?.episode ?? null,
    airingAt: m.nextAiringEpisode?.airingAt ?? null,
  }))
}
