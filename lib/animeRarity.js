// Única fuente de verdad para las rarezas de personajes de anime, compartida
// entre lib/jikan.js y lib/anilist.js (vive en su propio archivo para que
// esos dos no se importen entre sí en círculo — ambos son fuentes de datos
// para el mismo gacha, uno respaldo del otro). El rango de favoritos define
// el tier, y ese mismo tier define label y valor de reventa (.sellwaifu lee
// esto por clave, ya que solo persiste rarity.key en el inventario).
export const RARITY_TIERS = {
  legendaria: { label: '🌈 Legendaria', minFavorites: 10000, sellValue: 400 },
  epica:      { label: '💜 Épica',      minFavorites: 3000,  sellValue: 150 },
  rara:       { label: '💙 Rara',       minFavorites: 800,   sellValue: 60 },
  comun:      { label: '🤍 Común',      minFavorites: 0,     sellValue: 20 },
}

export function calcRarity(favorites = 0) {
  for (const key of ['legendaria', 'epica', 'rara', 'comun']) {
    if (favorites >= RARITY_TIERS[key].minFavorites) {
      return { key, ...RARITY_TIERS[key] }
    }
  }
}
