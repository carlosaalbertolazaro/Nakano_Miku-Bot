# Desplegar Miku en Oracle Cloud (Always Free, gratis para siempre)

Esta guía migra el bot de tu celular (Termux) a una VM real que corre 24/7,
gratis, sin depender de que tu teléfono esté prendido y conectado. Vas a
seguir estos pasos vos mismo (creación de cuenta y verificación de identidad
no las puedo hacer por vos) — cada paso está pensado para copiar/pegar.

## 0. Por qué Oracle Cloud

Baileys necesita un proceso corriendo sin parar con disco persistente
(la sesión de WhatsApp y la base de datos viven en archivos locales). La
mayoría de los hostings "gratis" (Render, Railway, Heroku) apagan el proceso
si no recibe tráfico web, lo cual mata la conexión de WhatsApp. Oracle Cloud
"Always Free" te da una VM de verdad, sin límite de tiempo, sin apagarse
nunca — es la opción gratuita real para este tipo de bot.

## 1. Crear la cuenta y la VM

1. Andá a [oracle.com/cloud/free](https://www.oracle.com/cloud/free/) y
   creá una cuenta (pide tarjeta para verificar identidad, pero la capa
   "Always Free" no cobra nada mientras no te salgas de sus límites).
2. En la consola, andá a **Compute > Instances > Create Instance**.
3. Elegí la imagen **Canonical Ubuntu 22.04** (buscala en "Change image").
4. En "Shape", elegí **VM.Standard.A1.Flex** (Ampere ARM) y asignale
   **2 OCPU / 12 GB de RAM** — está dentro de la capa Always Free (hasta
   4 OCPU / 24 GB en total) y sobra para este bot.
5. En "Add SSH keys", dejá que Oracle genere el par de claves y **descargá
   la clave privada** (`.key` o `.pem`) — la vas a necesitar para conectarte.
6. Creá la instancia y anotá la **IP pública** que te asigna.

No hace falta abrir ningún puerto de entrada: el bot solo hace conexiones
salientes hacia WhatsApp, así que la configuración de red que trae por
defecto (que permite SSH) alcanza.

## 2. Conectarte por SSH

Desde tu PC (o Termux, funciona igual):

```bash
chmod 600 la-clave-que-descargaste.key
ssh -i la-clave-que-descargaste.key ubuntu@TU_IP_PUBLICA
```

## 3. Instalar todo lo necesario

Ya en la VM, corré el script de instalación (Node, ffmpeg, git, pm2 — todo
lo que el bot necesita, en un solo paso):

```bash
curl -fsSL https://raw.githubusercontent.com/carlosaalbertolazaro/Nakano_Miku-Bot/main/scripts/setup-vm.sh | bash
```

Si preferís no correr un script bajado de internet sin mirarlo (bien ahí),
podés abrir [scripts/setup-vm.sh](scripts/setup-vm.sh) primero y copiar los
comandos a mano.

## 4. Clonar el repo

El repositorio es privado, así que necesitás un token de acceso:

1. En GitHub: **Settings > Developer settings > Personal access tokens >
   Fine-grained tokens > Generate new token**.
2. Dale acceso de solo lectura (`Contents: Read-only`) al repo
   `Nakano_Miku-Bot` únicamente, con una fecha de expiración (ej. 1 año).
3. En la VM:

```bash
git clone https://TU_USUARIO:TU_TOKEN@github.com/carlosaalbertolazaro/Nakano_Miku-Bot.git miku-bot
cd miku-bot
npm install
```

## 5. Configurar el `.env`

```bash
cp .env.example .env
nano .env
```

Agregá tu `GEMINI_API_KEY` (y cualquier otra variable que ya tengas
configurada en el `.env` de tu teléfono). Guardá con `Ctrl+O` → `Enter`,
salí con `Ctrl+X`.

## 6. Primer arranque (necesita el código de vinculación)

La primera vez tenés que correrlo en primer plano para escanear/vincular:

```bash
npm start
```

Te va a pedir tu número de teléfono y te va a dar un código de vinculación
— ingresalo en WhatsApp (Dispositivos vinculados > Vincular con número de
teléfono) igual que ya hacías en Termux. Una vez que veas
"✅ BOT CONECTADO" en la consola, apagalo con `Ctrl+C` — la sesión ya
quedó guardada en `sessions/`.

## 7. Dejarlo corriendo para siempre con pm2

```bash
npm run pm2:start
pm2 save
pm2 startup
```

El último comando (`pm2 startup`) te va a mostrar un comando para copiar y
pegar — correlo tal cual te lo indica. Eso hace que, si la VM se reinicia
(por mantenimiento de Oracle, por ejemplo), el bot arranque solo, sin que
tengas que hacer nada.

Comandos útiles después de esto:

```bash
npm run pm2:logs      # ver la consola en vivo
npm run pm2:restart   # reiniciar el bot
```

## 8. Actualizar el bot cuando yo suba cambios nuevos

```bash
cd ~/miku-bot
git pull
npm install
npm run pm2:restart
```

## Verificación

- `pm2 status` → el proceso `miku` debe figurar como `online`.
- Mandá `.menu` desde tu teléfono al número del bot y confirmá que responde
  igual que en Termux.
- Reiniciá la VM desde la consola de Oracle (Instance > Reboot) y, después
  de un par de minutos, confirmá que el bot volvió a conectarse solo
  (gracias a `pm2 startup`) sin que tengas que entrar por SSH.
