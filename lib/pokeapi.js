// Wrapper sobre PokeAPI (pokeapi.co/api/v2), pública y gratuita, sin API key.
// Verificado en vivo: 1025 especies (IDs 1-1025 válidos), sprites en
// sprites.other['official-artwork'].front_default/front_shiny, nombre en
// español en pokemon-species .names[].language.name === 'es'.

import Jimp from 'jimp'
import { fetchJsonWithRetry } from './httpJson.js'

const BASE = 'https://pokeapi.co/api/v2'
const POKEDEX_MAX = 1025
const SHINY_CHANCE = 1 / 100

function pokeGet(path, opts) {
  return fetchJsonWithRetry(`${BASE}${path}`, opts)
}

export const POKEMON_RARITY = {
  mitico:     { label: '💠 Mítico',     sellValue: 600 },
  legendario: { label: '⭐ Legendario', sellValue: 400 },
  comun:      { label: '🟢 Común',      sellValue: 30 },
}

function calcPokemonRarity(species) {
  if (species.is_mythical) return { key: 'mitico', ...POKEMON_RARITY.mitico }
  if (species.is_legendary) return { key: 'legendario', ...POKEMON_RARITY.legendario }
  return { key: 'comun', ...POKEMON_RARITY.comun }
}

export async function fetchRandomPokemon() {
  const id = Math.floor(Math.random() * POKEDEX_MAX) + 1
  const [pokemon, species] = await Promise.all([
    pokeGet(`/pokemon/${id}`),
    pokeGet(`/pokemon-species/${id}`),
  ])

  const nameEs = species?.names?.find(n => n.language?.name === 'es')?.name || pokemon.name
  const shiny = Math.random() < SHINY_CHANCE
  const art = pokemon.sprites?.other?.['official-artwork']
  const image = (shiny ? art?.front_shiny : art?.front_default) || art?.front_default || pokemon.sprites?.front_default || null

  return {
    id,
    name: pokemon.name,
    nameEs,
    types: pokemon.types?.map(t => t.type.name) || [],
    image,
    shiny,
    rarity: calcPokemonRarity(species || {}),
  }
}

// Genera una silueta negra a partir de una imagen con fondo transparente
// (como el official-artwork de PokeAPI): oscurece todos los píxeles a negro
// preservando el canal alfa, dando el efecto "¿Quién es este Pokémon?".
export async function generateSilhouette(imageUrl) {
  const res = await fetch(imageUrl)
  if (!res.ok) return null
  const buffer = Buffer.from(await res.arrayBuffer())
  const img = await Jimp.read(buffer)
  img.brightness(-1)
  return img.getBufferAsync(Jimp.MIME_PNG)
}
