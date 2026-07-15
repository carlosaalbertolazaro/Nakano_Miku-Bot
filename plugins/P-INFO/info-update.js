import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Solo owner: corre `git pull` (y `npm install` si package.json cambió) en
// el directorio del bot, para no tener que borrar y re-clonar todo en cada
// actualización. No reinicia el proceso solo — eso queda a mano (pm2 restart
// o cortar y volver a correr npm start), matando el proceso desde el propio
// proceso tiene demasiados casos raros (la respuesta podría no llegar a
// mandarse) para hacerlo automático sin poder probarlo en vivo.
const handler = async (m) => {
  await m.reply(`*『 🔄 』Buscando actualizaciones...*`)

  let pullOutput
  try {
    const { stdout, stderr } = await execAsync('git pull origin main', { cwd: process.cwd(), timeout: 60000 })
    pullOutput = `${stdout}${stderr}`.trim()
  } catch (e) {
    return m.reply(`*『 ❌ 』ERROR AL ACTUALIZAR*\n> ${e.message}\n\n> Si tenés cambios locales sin commitear que chocan con la actualización, resolvelo a mano con \`git status\`.`)
  }

  if (/Already up to date/i.test(pullOutput)) {
    return m.reply(`*『 ✅ 』YA ESTÁS AL DÍA*\n> No hay cambios nuevos en el repositorio.`)
  }

  await m.reply(`*『 ✅ 』ACTUALIZADO*\n\n\`\`\`${pullOutput.slice(0, 1500)}\`\`\``)

  if (/package\.json/.test(pullOutput)) {
    await m.reply(`*『 📦 』\`package.json\` cambió, instalando dependencias nuevas...*`)
    try {
      await execAsync('npm install', { cwd: process.cwd(), timeout: 180000 })
      await m.reply(`*『 ✅ 』DEPENDENCIAS INSTALADAS*`)
    } catch (e) {
      return m.reply(`*『 ⚠️ 』git pull salió bien pero \`npm install\` falló*\n> ${e.message}\n> Corré \`npm install\` manualmente.`)
    }
  }

  await m.reply(
    `*『 🔁 』REINICIÁ EL BOT PARA APLICAR LOS CAMBIOS*\n` +
    `> • Si usás pm2: \`pm2 restart miku\`\n` +
    `> • Si no: cortá con Ctrl+C y corré \`npm start\` de nuevo.`
  )
}

handler.help = ['update']
handler.desc = '(Owner) Actualizar el bot con git pull, sin borrar ni re-clonar nada.'
handler.tags = ['info']
handler.command = ['update', 'actualizar', 'pull']
handler.ownerOnly = true

export default handler
