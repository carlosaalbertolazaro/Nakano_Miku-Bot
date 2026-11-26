// Catálogo único de acciones: lo comparten el ejecutor de comandos y el menú
// para que ninguna reacción quede implementada pero escondida.
export const ACTIONS = {
  hug:         { endpoint: 'hug',        emoji: '🤗', verbo: 'abraza a' },
  abrazar:     { endpoint: 'hug',        emoji: '🤗', verbo: 'abraza a' },
  kiss:        { endpoint: 'kiss',       emoji: '💋', verbo: 'besa a' },
  besar:       { endpoint: 'kiss',       emoji: '💋', verbo: 'besa a' },
  pat:         { endpoint: 'pat',        emoji: '🖐️', verbo: 'acaricia a' },
  acariciar:   { endpoint: 'pat',        emoji: '🖐️', verbo: 'acaricia a' },
  slap:        { endpoint: 'slap',       emoji: '✋', verbo: 'abofetea a' },
  cachetada:   { endpoint: 'slap',       emoji: '✋', verbo: 'abofetea a' },
  cuddle:      { endpoint: 'cuddle',     emoji: '🥰', verbo: 'se acurruca con' },
  acurrucar:   { endpoint: 'cuddle',     emoji: '🥰', verbo: 'se acurruca con' },
  poke:        { endpoint: 'poke',       emoji: '👉', verbo: 'pica a' },
  picar:       { endpoint: 'poke',       emoji: '👉', verbo: 'pica a' },
  bite:        { endpoint: 'bite',       emoji: '😬', verbo: 'muerde a' },
  morder:      { endpoint: 'bite',       emoji: '😬', verbo: 'muerde a' },
  tickle:      { endpoint: 'tickle',     emoji: '🤣', verbo: 'hace cosquillas a' },
  cosquillas:  { endpoint: 'tickle',     emoji: '🤣', verbo: 'hace cosquillas a' },
  // `kick` queda reservado para expulsar miembros; en roleplay se usa patear.
  patear:      { endpoint: 'kick',       emoji: '🦵', verbo: 'patea a' },
  punch:       { endpoint: 'punch',      emoji: '👊', verbo: 'golpea a' },
  golpear:     { endpoint: 'punch',      emoji: '👊', verbo: 'golpea a' },
  cry:         { endpoint: 'cry',        emoji: '😢', verbo: 'llora', standalone: true },
  llorar:      { endpoint: 'cry',        emoji: '😢', verbo: 'llora', standalone: true },
  dance:       { endpoint: 'dance',      emoji: '💃', verbo: 'baila', standalone: true },
  bailar:      { endpoint: 'dance',      emoji: '💃', verbo: 'baila', standalone: true },
  blush:       { endpoint: 'blush',      emoji: '😳', verbo: 'se sonroja', standalone: true },
  sonrojar:    { endpoint: 'blush',      emoji: '😳', verbo: 'se sonroja', standalone: true },
  smile:       { endpoint: 'smile',      emoji: '😊', verbo: 'sonríe', standalone: true },
  sonreir:     { endpoint: 'smile',      emoji: '😊', verbo: 'sonríe', standalone: true },
  wave:        { endpoint: 'wave',       emoji: '👋', verbo: 'saluda a' },
  saludar:     { endpoint: 'wave',       emoji: '👋', verbo: 'saluda a' },
  highfive:    { endpoint: 'highfive',   emoji: '🙏', verbo: 'choca la mano con' },
  chocala:     { endpoint: 'highfive',   emoji: '🙏', verbo: 'choca la mano con' },
  handhold:    { endpoint: 'handhold',   emoji: '🤝', verbo: 'toma de la mano a' },
  tomarmano:   { endpoint: 'handhold',   emoji: '🤝', verbo: 'toma de la mano a' },
  feed:        { endpoint: 'feed',       emoji: '🍽️', verbo: 'le da de comer a' },
  alimentar:   { endpoint: 'feed',       emoji: '🍽️', verbo: 'le da de comer a' },
  carry:       { endpoint: 'carry',      emoji: '🐴', verbo: 'carga a' },
  cargar:      { endpoint: 'carry',      emoji: '🐴', verbo: 'carga a' },
  bonk:        { endpoint: 'bonk',       emoji: '🔨', verbo: 'le da un bonk a' },
  baka:        { endpoint: 'baka',       emoji: '😤', verbo: 'le grita baka a' },
  yeet:        { endpoint: 'yeet',       emoji: '🚀', verbo: 'yeetea a' },
  wink:        { endpoint: 'wink',       emoji: '😉', verbo: 'le guiña el ojo a' },
  guinio:      { endpoint: 'wink',       emoji: '😉', verbo: 'le guiña el ojo a' },
  angry:       { endpoint: 'angry',      emoji: '😠', verbo: 'está enojado/a', standalone: true },
  enojado:     { endpoint: 'angry',      emoji: '😠', verbo: 'está enojado/a', standalone: true },
  happy:       { endpoint: 'happy',      emoji: '😄', verbo: 'está feliz', standalone: true },
  feliz:       { endpoint: 'happy',      emoji: '😄', verbo: 'está feliz', standalone: true },
  laugh:       { endpoint: 'laugh',      emoji: '😂', verbo: 'se ríe', standalone: true },
  reir:        { endpoint: 'laugh',      emoji: '😂', verbo: 'se ríe', standalone: true },
  pout:        { endpoint: 'pout',       emoji: '😤', verbo: 'hace puchero', standalone: true },
  puchero:     { endpoint: 'pout',       emoji: '😤', verbo: 'hace puchero', standalone: true },
  run:         { endpoint: 'run',        emoji: '🏃', verbo: 'sale corriendo', standalone: true },
  correr:      { endpoint: 'run',        emoji: '🏃', verbo: 'sale corriendo', standalone: true },
  think:       { endpoint: 'think',      emoji: '🤔', verbo: 'está pensando', standalone: true },
  pensar:      { endpoint: 'think',      emoji: '🤔', verbo: 'está pensando', standalone: true },
  facepalm:    { endpoint: 'facepalm',   emoji: '🤦', verbo: 'se golpea la cara con la mano', standalone: true },
  shocked:     { endpoint: 'shocked',    emoji: '😱', verbo: 'está en shock', standalone: true },
  sorprendido: { endpoint: 'shocked',    emoji: '😱', verbo: 'está en shock', standalone: true },
  shrug:       { endpoint: 'shrug',      emoji: '🤷', verbo: 'se encoge de hombros', standalone: true },
  stare:       { endpoint: 'stare',      emoji: '👀', verbo: 'mira fijamente a' },
  mirar:       { endpoint: 'stare',      emoji: '👀', verbo: 'mira fijamente a' },
  confused:    { endpoint: 'confused',   emoji: '😕', verbo: 'está confundido/a', standalone: true },
  confundido:  { endpoint: 'confused',   emoji: '😕', verbo: 'está confundido/a', standalone: true },
  bored:       { endpoint: 'bored',      emoji: '😑', verbo: 'está aburrido/a', standalone: true },
  aburrido:    { endpoint: 'bored',      emoji: '😑', verbo: 'está aburrido/a', standalone: true },
  yawn:        { endpoint: 'yawn',       emoji: '🥱', verbo: 'bosteza', standalone: true },
  bostezar:    { endpoint: 'yawn',       emoji: '🥱', verbo: 'bosteza', standalone: true },
  sleep:       { endpoint: 'sleep',      emoji: '😴', verbo: 'se va a dormir', standalone: true },
  dormir:      { endpoint: 'sleep',      emoji: '😴', verbo: 'se va a dormir', standalone: true },
  clap:        { endpoint: 'clap',       emoji: '👏', verbo: 'aplaude', standalone: true },
  aplaudir:    { endpoint: 'clap',       emoji: '👏', verbo: 'aplaude', standalone: true },
  handshake:   { endpoint: 'handshake',  emoji: '🤝', verbo: 'estrecha la mano de' },
  blowkiss:    { endpoint: 'blowkiss',   emoji: '😘', verbo: 'le tira un beso a' },
  besovolador: { endpoint: 'blowkiss',   emoji: '😘', verbo: 'le tira un beso a' },
  salute:      { endpoint: 'salute',     emoji: '🫡', verbo: 'saluda con respeto', standalone: true },
  thumbsup:    { endpoint: 'thumbsup',   emoji: '👍', verbo: 'da el visto bueno', standalone: true },
  tableflip:   { endpoint: 'tableflip',  emoji: '🤬', verbo: 'voltea la mesa', standalone: true },
  voltearmesa: { endpoint: 'tableflip',  emoji: '🤬', verbo: 'voltea la mesa', standalone: true },
  kabedon:     { endpoint: 'kabedon',    emoji: '🧱', verbo: 'le hace un kabedon a' },
  nom:         { endpoint: 'nom',        emoji: '😋', verbo: 'está comiendo', standalone: true },
  comer:       { endpoint: 'nom',        emoji: '😋', verbo: 'está comiendo', standalone: true },
  smug:        { endpoint: 'smug',       emoji: '😏', verbo: 'pone cara de superioridad', standalone: true },
  spin:        { endpoint: 'spin',       emoji: '🌀', verbo: 'da vueltas', standalone: true },
  girar:       { endpoint: 'spin',       emoji: '🌀', verbo: 'da vueltas', standalone: true },
  nod:         { endpoint: 'nod',        emoji: '🙂', verbo: 'asiente', standalone: true },
  asentir:     { endpoint: 'nod',        emoji: '🙂', verbo: 'asiente', standalone: true },
  nope:        { endpoint: 'nope',       emoji: '🙅', verbo: 'dice que no', standalone: true },
  lurk:        { endpoint: 'lurk',       emoji: '👀', verbo: 'está acechando por acá', standalone: true },
  acechar:     { endpoint: 'lurk',       emoji: '👀', verbo: 'está acechando por acá', standalone: true },
  shoot:       { endpoint: 'shoot',      emoji: '🔫', verbo: 'le apunta con un arma a' },
  disparar:    { endpoint: 'shoot',      emoji: '🔫', verbo: 'le apunta con un arma a' },
  // nekos.best no tiene un endpoint "kill": se reutiliza su animación real
  // `shoot` para esta acción ficticia, sin añadir otra API frágil.
  kill:        { endpoint: 'shoot',      emoji: '💥', verbo: 'elimina a' },
  matar:       { endpoint: 'shoot',      emoji: '💥', verbo: 'elimina a' },
  peck:        { endpoint: 'peck',       emoji: '😘', verbo: 'le da un piquito a' },
  piquito:     { endpoint: 'peck',       emoji: '😘', verbo: 'le da un piquito a' },
  sip:         { endpoint: 'sip',        emoji: '🍵', verbo: 'toma un sorbo tranquilamente', standalone: true },
  sorber:      { endpoint: 'sip',        emoji: '🍵', verbo: 'toma un sorbo tranquilamente', standalone: true },
  wag:         { endpoint: 'wag',        emoji: '🐶', verbo: 'menea la cola', standalone: true },
  menearcola:  { endpoint: 'wag',        emoji: '🐶', verbo: 'menea la cola', standalone: true },
  teehee:      { endpoint: 'teehee',     emoji: '😝', verbo: 'se ríe con picardía', standalone: true },
  nya:         { endpoint: 'nya',        emoji: '🐱', verbo: 'hace nya~', standalone: true },
  lappillow:   { endpoint: 'lappillow',  emoji: '🛌', verbo: 'usa de almohada a' },
  almohada:    { endpoint: 'lappillow',  emoji: '🛌', verbo: 'usa de almohada a' },
  shake:       { endpoint: 'shake',      emoji: '🫨', verbo: 'sacude a' },
  sacudir:     { endpoint: 'shake',      emoji: '🫨', verbo: 'sacude a' },
  bleh:        { endpoint: 'bleh',       emoji: '😛', verbo: 'saca la lengua', standalone: true },
  lengua:      { endpoint: 'bleh',       emoji: '😛', verbo: 'saca la lengua', standalone: true },
}

const PAGE_DEFINITIONS = [
  {
    title: '💞 Cariño y cercanía',
    keys: ['hug', 'kiss', 'pat', 'cuddle', 'highfive', 'handhold', 'feed', 'carry', 'wink', 'blowkiss', 'peck', 'lappillow', 'kabedon'],
  },
  {
    title: '✨ Interacción y bromas',
    keys: ['slap', 'patear', 'punch', 'poke', 'bite', 'tickle', 'bonk', 'baka', 'yeet', 'wave', 'handshake', 'stare', 'shoot', 'kill', 'shake'],
  },
  {
    title: '😊 Emociones',
    keys: ['cry', 'blush', 'smile', 'angry', 'happy', 'laugh', 'pout', 'shocked', 'confused', 'bored', 'yawn', 'sleep', 'teehee', 'smug', 'nod', 'nope', 'bleh'],
  },
  {
    title: '🎭 Actividades y expresiones',
    keys: ['dance', 'run', 'think', 'facepalm', 'shrug', 'clap', 'salute', 'thumbsup', 'tableflip', 'nom', 'spin', 'lurk', 'sip', 'wag', 'nya'],
  },
]

function aliasesFor(key) {
  const action = ACTIONS[key]
  if (!action) throw new Error(`Acción de roleplay desconocida en el menú: ${key}`)
  return Object.keys(ACTIONS).filter(command => {
    const candidate = ACTIONS[command]
    return candidate.endpoint === action.endpoint &&
      candidate.verbo === action.verbo &&
      Boolean(candidate.standalone) === Boolean(action.standalone)
  })
}

export const ROLEPLAY_MENU_PAGES = PAGE_DEFINITIONS.map(page => ({
  title: page.title,
  actions: page.keys.map(aliasesFor),
}))

export const ROLEPLAY_ACTION_COUNT = ROLEPLAY_MENU_PAGES.reduce(
  (total, page) => total + page.actions.length,
  0,
)
