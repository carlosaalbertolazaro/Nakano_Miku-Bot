import { fetchReactionGif, downloadReactionGifBuffer } from '../../lib/nekosbest.js'

// Todas las acciones vienen de endpoints REALES y verificados de nekos.best
// (GET /api/v2/endpoints), no inventados. Cada acción tiene un alias en
// inglés (el nombre del endpoint) y uno en español. `standalone: true` marca
// acciones que no piden un objeto directo ("llora", no "llora a alguien") —
// si igual mencionás a alguien se muestra como motivo/contexto.
const ACTIONS = {
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
  // OJO: 'kick' (en inglés) NO se registra acá a propósito — ya lo usa
  // grupo-ban.js para expulsar gente del grupo, un comando mucho más
  // sensible. Esta acción de roleplay solo responde en español.
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
}

const handler = async (m, { conn, command }) => {
  const action = ACTIONS[command]
  if (!action) return

  let gif
  let gifBuffer = null
  try {
    gif = await fetchReactionGif(action.endpoint)
    gifBuffer = await downloadReactionGifBuffer(gif.url)
  } catch (e) {
    if (!gif) {
      return m.reply(`*『 ❌ 』ERROR*\n> No se pudo obtener el gif ahora mismo. Probá de nuevo en un rato.\n> _${e.message}_`)
    }
    // Se consiguió el link pero falló la descarga — seguimos igual con la
    // URL directa como último recurso (puede fallar de nuevo, pero es mejor
    // intentarlo que no mandar nada).
  }

  const target = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null)
  const senderTag = `@${m.sender.split('@')[0]}`

  let caption
  if (target && !action.standalone) {
    caption = `${action.emoji} ${senderTag} ${action.verbo} @${target.split('@')[0]}`
  } else if (target) {
    caption = `${action.emoji} ${senderTag} ${action.verbo} (por @${target.split('@')[0]})`
  } else {
    caption = `${action.emoji} ${senderTag} ${action.verbo}`
  }

  const mentions = target ? [m.sender, target] : [m.sender]

  try {
    // video + gifPlayback:true (no image) para que WhatsApp lo reproduzca
    // animado en loop — un mensaje de imagen, aunque el archivo sea un gif
    // real, siempre se muestra estático. Reusa el helper m.replyVideo que
    // ya existía en el codebase para esto mismo.
    await m.replyVideo(gifBuffer || { url: gif.url }, caption, true, { mentions })
  } catch {
    await m.reply(caption)
  }
}

handler.help = ['<accion> [@user] — ej: abrazar, besar, acariciar, cachetada, cuddle, patear, morder...']
handler.desc = 'Reacciones/GIFs de anime para interactuar con alguien (o solo/a). ~40 acciones en español e inglés — abrazar, besar, acariciar, cachetada, cuddle, morder, patear, bailar, llorar, y muchas más.'
handler.tags = ['roleplay']
handler.command = Object.keys(ACTIONS)

export default handler
