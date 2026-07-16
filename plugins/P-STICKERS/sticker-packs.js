import { listPacks, createPack, deletePack, addStickerToPack, getPack } from '../../lib/stickerPacks.js'
import fs from 'fs'

async function nuevo(m, { text, usedPrefix }) {
  if (!text?.trim()) return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}newpack <nombre>`)
  try {
    await createPack(m.sender, text.trim())
    await m.reply(`*『 ✅ 』Pack "${text.trim()}" creado.*\n> Respondé a un sticker con *${usedPrefix}stickeradd ${text.trim()}* para agregarlo.`)
  } catch (e) {
    await m.reply(`*『 ❌ 』${e.message}`)
  }
}

async function borrar(m, { text, usedPrefix }) {
  if (!text?.trim()) return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}delpack <nombre>`)
  try {
    await deletePack(m.sender, text.trim())
    await m.reply(`*『 🗑️ 』Pack "${text.trim()}" eliminado.*`)
  } catch (e) {
    await m.reply(`*『 ❌ 』${e.message}`)
  }
}

async function agregar(m, { text, usedPrefix }) {
  if (!text?.trim()) return m.reply(`*『 ℹ️ 』USO*\n> Respondé a un sticker con ${usedPrefix}stickeradd <nombre del pack>`)
  if (m.quoted?.mtype !== 'stickerMessage') return m.reply(`*『 ✙ 』Respondé a un STICKER (no imagen/video) para agregarlo a un pack.*`)

  try {
    const buffer = await m.quoted.download()
    if (!buffer) throw new Error('No se pudo descargar el sticker.')
    const total = await addStickerToPack(m.sender, text.trim(), buffer)
    await m.reply(`*『 ✅ 』Sticker agregado a "${text.trim()}".*\n> Ese pack ya tiene *${total}* stickers.`)
  } catch (e) {
    await m.reply(`*『 ❌ 』${e.message}`)
  }
}

async function listar(m, { usedPrefix }) {
  const packs = await listPacks(m.sender)
  if (!packs.length) {
    return m.reply(`*『 📦 』SIN PACKS*\n> Creá uno con *${usedPrefix}newpack <nombre>*.`)
  }

  let txt = `*┏━━•❈ 📦 TUS PACKS ❈•━━┓*\n\n`
  for (const p of packs) txt += `> *${p.displayName}* — ${p.count} sticker${p.count === 1 ? '' : 's'}\n`
  txt += `\n> ${usedPrefix}getpack <nombre> para recibirlos todos.\n*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  await m.reply(txt)
}

async function obtener(m, { conn, text, usedPrefix }) {
  if (!text?.trim()) return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}getpack <nombre>`)

  const pack = await getPack(m.sender, text.trim())
  if (!pack || !pack.files.length) {
    return m.reply(`*『 ❌ 』No tenés ningún pack con stickers guardados con ese nombre.*`)
  }

  await m.reply(`*『 📦 』Mandando ${pack.files.length} sticker(s) de "${pack.displayName}"...*`)
  for (const filePath of pack.files) {
    try {
      if (!fs.existsSync(filePath)) continue
      const buffer = await fs.promises.readFile(filePath)
      await conn.sendMessage(m.chat, { sticker: buffer }, { quoted: m })
    } catch {}
  }
}

const handler = async (m, ctx) => {
  const cmd = ctx.command
  if (cmd === 'newpack' || cmd === 'newstickerpack') return nuevo(m, ctx)
  if (cmd === 'delpack') return borrar(m, ctx)
  if (cmd === 'stickeradd' || cmd === 'addsticker') return agregar(m, ctx)
  if (cmd === 'getpack' || cmd === 'stickerpack') return obtener(m, ctx)
  return listar(m, ctx)
}

handler.help = ['newpack <nombre>', 'delpack <nombre>', 'stickeradd <nombre>', 'getpack <nombre>', 'stickerpacks']
handler.desc = 'Guardá stickers en packs con nombre para volver a mandarlos todos juntos cuando quieras.'
handler.tags = ['stickers']
handler.command = ['newpack', 'newstickerpack', 'delpack', 'stickeradd', 'addsticker', 'getpack', 'stickerpack', 'stickerpacks', 'packlist']

export default handler
