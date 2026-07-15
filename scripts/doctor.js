// Diagnóstico rápido del entorno de hosting (Termux nativo, proot-distro, o Linux/servidor).
// Uso: npm run doctor

import { spawnSync } from 'child_process'
import chalk from 'chalk'

function check(label, cmd, args = ['--version'], { optional = false, hint = '' } = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf-8' })
  const ok = !res.error && res.status === 0
  const icon = ok ? chalk.green('✔') : (optional ? chalk.yellow('○') : chalk.red('✘'))
  const version = ok ? (res.stdout || res.stderr || '').split('\n')[0].trim() : ''
  console.log(`${icon} ${label.padEnd(22)} ${ok ? chalk.dim(version) : chalk.dim(hint || 'no encontrado')}`)
  return ok
}

console.log(chalk.bold.cyanBright('\n🩺 Miku — Diagnóstico del entorno\n'))

const nodeOk = check('Node.js', 'node', ['--version'])
const npmOk = check('npm', 'npm', ['--version'])
const ffmpegOk = check('ffmpeg', 'ffmpeg', ['-version'], {
  hint: 'requerido — instalá con: pkg install ffmpeg (Termux) o apt install ffmpeg',
})
const gitOk = check('git', 'git', ['--version'], {
  hint: 'requerido para clonar/actualizar el repo — pkg install git',
})
const pm2Ok = check('pm2', 'pm2', ['--version'], {
  optional: true,
  hint: 'recomendado para mantener el bot corriendo 24/7 — npm install -g pm2',
})
const wakeLockOk = check('termux-wake-lock', 'termux-wake-lock', ['--help'], {
  optional: true,
  hint: 'solo Termux — evita que Android mate el proceso en background (pkg install termux-api)',
})

console.log('')
if (nodeOk) {
  const versionStr = spawnSync('node', ['--version']).stdout?.toString().trim() || ''
  const major = parseInt(versionStr.replace('v', '').split('.')[0])
  if (major < 18) {
    console.log(chalk.red(`✘ Node ${versionStr} es muy viejo — se requiere Node >= 18.`))
  }
}

const critical = [nodeOk, npmOk, ffmpegOk, gitOk]
if (critical.every(Boolean)) {
  console.log(chalk.bold.greenBright('✅ Todo lo esencial está listo. Podés correr: npm start'))
} else {
  console.log(chalk.bold.redBright('⚠️  Faltan dependencias esenciales — revisá los ✘ de arriba antes de arrancar el bot.'))
}

if (!pm2Ok || !wakeLockOk) {
  console.log(chalk.yellow('\nℹ️  Los ○ son opcionales pero recomendados para hosting 24/7 en el teléfono (ver README).'))
}

console.log('')
