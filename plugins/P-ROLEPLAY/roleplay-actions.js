import { fetchReactionGif, downloadReactionGifBuffer } from '../../lib/nekosbest.js'
import { gifToMp4 } from '../../lib/gifToMp4.js'

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
  lurk:        { endpoint: 'lurk',       emoji: '👀', verbo: 'está acechando por acá', standalone: true },
  acechar:     { endpoint: 'lurk',       emoji: '👀', verbo: 'está acechando por acá', standalone: true },
  shoot:       { endpoint: 'shoot',      emoji: '🔫', verbo: 'le apunta con un arma a' },
  disparar:    { endpoint: 'shoot',      emoji: '🔫', verbo: 'le apunta con un arma a' },
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
}

const handler = async (m, { conn, command }) => {
  const action = ACTIONS[command]
  if (!action) return

  let gif
  let gifBuffer = null
  let mp4Buffer = null
  try {
    gif = await fetchReactionGif(action.endpoint)
    gifBuffer = await downloadReactionGifBuffer(gif.url)
    // Un .gif real mandado como "video" no es un contenedor de video válido
    // — WhatsApp lo muestra una vez pero no lo puede descargar/reproducir de
    // nuevo. Se convierte a MP4 de verdad antes de mandarlo.
    mp4Buffer = await gifToMp4(gifBuffer)
  } catch (e) {
    if (!gif) {
      return m.reply(`*『 ❌ 』ERROR*\n> No se pudo obtener el gif ahora mismo. Probá de nuevo en un rato.\n> _${e.message}_`)
    }
    // Se consiguió el link pero falló la descarga o la conversión — seguimos
    // igual con lo que se pudo conseguir (mejor que no mandar nada).
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
    if (mp4Buffer) {
      // video + gifPlayback:true (mp4 de verdad) para que WhatsApp lo
      // reproduzca animado en loop Y se pueda descargar. Reusa el helper
      // m.replyVideo que ya existía en el codebase para esto mismo.
      await m.replyVideo(mp4Buffer, caption, true, { mentions })
    } else {
      // No se pudo convertir a mp4 (¿ffmpeg no está instalado?) — mandamos
      // como imagen estática en vez de nada.
      await conn.sendMessage(m.chat, { image: gifBuffer || { url: gif.url }, caption, mentions }, { quoted: m })
    }
  } catch {
    await m.reply(caption)
  }
}

// Se pidió explícitamente listar TODAS las acciones acá (no solo un par de
// ejemplos) porque los miembros nuevos del grupo no se enteraban de que
// existían — quedaban escondidas dentro de un solo comando genérico
// "<accion> [@user]" en el menú.
handler.help = ['<accion> [@user]']
handler.desc =
  'Reacciones/GIFs de anime para interactuar con alguien (o solo/a) — escribí cualquiera de estos como comando, ' +
  'mencionando o respondiendo a alguien si aplica:\n' +
  'hug/abrazar, kiss/besar, pat/acariciar, slap/cachetada, cuddle/acurrucar\n' +
  'poke/picar, bite/morder, tickle/cosquillas, patear, punch/golpear\n' +
  'cry/llorar, dance/bailar, blush/sonrojar, smile/sonreir, wave/saludar\n' +
  'highfive/chocala, handhold/tomarmano, feed/alimentar, carry/cargar, bonk\n' +
  'baka, yeet, wink/guinio, angry/enojado, happy/feliz\n' +
  'laugh/reir, pout/puchero, run/correr, think/pensar, facepalm\n' +
  'shocked/sorprendido, shrug, stare/mirar, confused/confundido, bored/aburrido\n' +
  'yawn/bostezar, sleep/dormir, clap/aplaudir, handshake, blowkiss/besovolador\n' +
  'salute, thumbsup, tableflip/voltearmesa, kabedon, nom/comer\n' +
  'smug, spin/girar, nod/asentir, nope, lurk/acechar\n' +
  'shoot/disparar, peck/piquito, sip/sorber, wag/menearcola, teehee\n' +
  'nya, lappillow/almohada, shake/sacudir'
handler.tags = ['roleplay']
handler.command = Object.keys(ACTIONS)

export default handler
