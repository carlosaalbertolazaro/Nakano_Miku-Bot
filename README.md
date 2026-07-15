<div align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=42&pause=2000&color=FF6FA5&center=true&vCenter=true&width=600&height=80&lines=Miku+%F0%9F%8E%80;NNakano+Miku+%E2%80%A2+WhatsApp+Bot" alt="Miku"/>
</div>

<div align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&size=14&pause=2000&color=ffffff&center=true&vCenter=true&width=600&lines=Asistente+de+WhatsApp+para+comunidades+%E2%80%A2+Baileys+Multi-Device" alt="subtitle"/>
</div>

<br/>

<div align="center">
  <img src="https://img.shields.io/badge/-Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/-WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white"/>
  <img src="https://img.shields.io/badge/-FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white"/>
  <img src="https://img.shields.io/badge/-Git-F05032?style=for-the-badge&logo=git&logoColor=white"/>
</div>

<br/>

<div align="center">
  <img src="https://img.shields.io/badge/estado-activo-00ff88?style=flat-square"/>
  <img src="https://img.shields.io/badge/plataforma-Termux%20%7C%20Linux-black?style=flat-square&logoColor=00ffe0"/>
  <img src="https://img.shields.io/badge/hecho%20por-Carlos-ff6fa5?style=flat-square"/>
</div>

---

## 📦 Requisitos previos

| Herramienta | Descripción |
|-------------|-------------|
| <img src="https://img.shields.io/badge/Termux-000000?style=flat-square&logo=gnometerminal&logoColor=00ffe0"/> | Emulador de terminal para Android (instalar desde F-Droid, no Play Store). |
| <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white"/> | Entorno de ejecución JS. Se requiere versión ≥18. |
| <img src="https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white"/> | Sistema de control de versiones. |
| <img src="https://img.shields.io/badge/FFmpeg-007808?style=flat-square&logo=ffmpeg&logoColor=white"/> | Necesario para stickers, conversiones y todo lo multimedia. |

> Después de instalar, corré `npm run doctor` para verificar que todo esté bien configurado (ver sección [Diagnóstico](#-diagnóstico-npm-run-doctor)).

---

## 🚀 Instalación

Miku está pensada para vivir **directamente en tu teléfono**, sin depender de una PC o VPS encendida 24/7. Hay dos formas de hostearla, con **Termux nativo como la recomendada**.

### Opción A — Termux nativo (recomendado)

Más liviana, menos batería, menos RAM. Es la forma por defecto.

```bash
pkg update && pkg upgrade
pkg install git nodejs ffmpeg -y

termux-setup-storage   # opcional, solo si vas a trabajar archivos en /sdcard

git clone https://github.com/carlosaalbertolazaro/Nakano_Miku-Bot.git ~/miku-bot
cd ~/miku-bot
npm install
npm run doctor          # verifica que todo esté OK antes de arrancar
npm start
```

### Opción B — proot-distro (Ubuntu/Debian dentro de Termux)

Solo si necesitás un entorno Linux completo (glibc) por alguna herramienta puntual que no exista como paquete de Termux. Tiene overhead extra (traducción de syscalls) — más lento y consume más batería que la Opción A. Todas las dependencias de este proyecto son JS puro o invocan binarios ya soportados en Termux nativo, así que normalmente **no vas a necesitar esta opción**.

```bash
pkg install proot-distro -y
proot-distro install ubuntu
proot-distro login ubuntu

# Dentro de la distro:
apt update && apt install -y git nodejs npm ffmpeg
git clone https://github.com/carlosaalbertolazaro/Nakano_Miku-Bot.git ~/miku-bot
cd ~/miku-bot
npm install
npm start
```

En el primer inicio, si `usePairingCode` está activado en `config.js` (por defecto lo está), el bot pedirá tu número de WhatsApp (sin `+`) y va a generar un código de 8 dígitos para ingresar en **WhatsApp → Dispositivos vinculados**.

---

## ⚙️ Configuración inicial

Editá `config.js`:

```js
const config = {
  ownerNumber: ['5491112345678'], // tu número completo, sin el +
}
```

Y si vas a usar el módulo de IA (Gemini) o las alertas de Aternos más adelante, copiá `.env.example` a `.env` y completá las variables ahí — ningún dato sensible va en `config.js`.

```bash
cp .env.example .env
nano .env
```

Reiniciá el bot después de cualquier cambio de configuración:

```bash
npm start
```

---

## 🔄 Mantener a Miku corriendo 24/7 en el teléfono

Esto es lo más importante para un hosting confiable desde Android — sin esto, el sistema operativo mata el proceso apenas el teléfono se bloquea o Termux pasa a segundo plano.

### 1 — Evitar que Android suspenda el proceso

En **Ajustes → Apps → Termux → Batería**, desactivá la optimización de batería / poné "Sin restricciones". Es la causa #1 de que un bot self-hosted en celular "se caiga solo".

Además, antes de dejar el bot corriendo en background, corré:

```bash
termux-wake-lock
```

(Requiere el paquete `termux-api`: `pkg install termux-api`.)

### 2 — Reinicio automático si el proceso crashea: `pm2`

```bash
npm install -g pm2
npm run pm2:start    # equivale a: pm2 start zen.js --name miku
npm run pm2:save     # guarda el estado actual para poder restaurarlo
npm run pm2:logs     # ver logs en vivo
```

Otros comandos útiles: `npm run pm2:stop`, `npm run pm2:restart`.

### 3 — Autoarranque cuando el teléfono se reinicia: Termux:Boot

1. Instalá **Termux:Boot** desde F-Droid (mismo store que Termux).
2. Abrila una vez para que cree `~/.termux/boot/`.
3. Copiá el script de ejemplo incluido en este repo:

```bash
mkdir -p ~/.termux/boot
cp scripts/termux-boot-miku.sh.example ~/.termux/boot/miku.sh
chmod +x ~/.termux/boot/miku.sh
```

4. Editá `BOT_DIR` dentro de `~/.termux/boot/miku.sh` si tu proyecto no está en `~/miku-bot`.
5. Reiniciá el teléfono para probar.

---

## 🩺 Diagnóstico (`npm run doctor`)

Corré esto si algo no arranca — revisa Node, npm, ffmpeg, git, pm2 y termux-wake-lock, y te dice exactamente qué falta y cómo instalarlo:

```bash
npm run doctor
```

---

## 🧩 Agregar un plugin nuevo

Los comandos de Miku son "plugins" — cualquier archivo `.js` dentro de `plugins/<CATEGORIA>/` se carga automáticamente (con hot-reload, no hace falta reiniciar el bot). Usá `templates/plugin-template.js` como punto de partida — tiene documentado el contrato completo (qué exportar, qué propiedades usar, hooks disponibles).

---

## ⭐ Apoyo al proyecto

Si Miku te sirve, dejá una estrella en el repo — ayuda a que el proyecto siga creciendo.

---

## 👤 Créditos

<div align="center">

Creada y mantenida por **Carlos**, sobre una base original de código abierto.

<br/>

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&size=13&pause=2000&color=FF6FA5&center=true&vCenter=true&width=400&lines=Miku+%E2%80%A2+Carlos+%C2%A9+2026" alt="footer"/>

</div>

---

[1]: https://f-droid.org/en/packages/com.termux/ "Termux en F-Droid"
