# Desplegar Miku en Railway desde GitHub

El bot funciona como un proceso en segundo plano: **no necesita dominio, puerto ni PM2**. Usá una sola réplica.

> Para tenerlo activo 24/7 conviene el plan **Hobby**. El plan Free solo incluye USD 1 de uso mensual y detiene los servicios cuando se agota; la prueba inicial tampoco es permanente.

## 1. Preparar el repositorio

- Revisá que `ownerNumber` en `config.js` tenga tu número real, sin `+`.
- Subí a GitHub los cambios más recientes del proyecto.
- No subas `.env`, `sessions/` ni `lib/database/data/`; ya están ignorados por Git.

## 2. Crear el servicio

1. En Railway: **New Project → Deploy from GitHub Repo** y elegí `Nakano_Miku-Bot`.
2. Agregá un **Volume** al servicio con este **Mount Path**:

   ```text
   /data
   ```

   Ahí se guardarán la sesión (`/data/sessions/main`) y la base de datos (`/data/database`). Sin este volumen, ambos se pierden al redesplegar.

## 3. Configurar variables

En **Service → Variables**, agregá:

```env
NODE_ENV=production
GROQ_API_KEY=tu_clave_de_groq
GEMINI_API_KEY=tu_clave_de_gemini (opcional, respaldo)
NVIDIA_API_KEY=tu_clave_de_nvidia (opcional, respaldo)
WHATSAPP_NUMBER=tu_numero_con_codigo_de_pais (ej. 522285117201 en Mexico)
RAILPACK_DEPLOY_APT_PACKAGES=ffmpeg
```

`WHATSAPP_NUMBER` es el número de la cuenta que hará de bot (con código de país, sin `+`, ej. `522285117201`) y solo se necesita para la primera vinculación. `GEMINI_API_KEY`, `NVIDIA_API_KEY`, `ATERNOS_SERVER_HOST` y `ATERNOS_SERVER_PORT` siguen siendo opcionales.

Railway usa **Railpack** por defecto. La variable `RAILPACK_DEPLOY_APT_PACKAGES` instala FFmpeg en la imagen final. El comando de inicio se detecta desde `package.json`; si Railway lo solicita, usá **únicamente**:

```bash
npm start
```

No dejes comandos como `rm -rf /data/sessions/main && npm start`: borran el vínculo en cada arranque. Mantené **una sola réplica** y no ejecutes otro servicio con la misma carpeta de sesión.

### Sound stickers (experimental)

`.saudio` (también `.stickeraudio` y `.soundsticker`) convierte los primeros 5 segundos de un video en WebP animado + OGG Opus. Si el video no tiene audio, falla la conversión o Baileys/WhatsApp rechaza el mensaje compuesto, envía un sticker animado normal como fallback.

La dependencia está fijada en `@itsliaaa/baileys@0.5.6` (commit `b07993d`) porque esa versión incluye `StickerMessage.audioMessage` en el campo `26`. No la actualices sin ejecutar las pruebas de compatibilidad. La función de WhatsApp todavía tiene disponibilidad gradual y requiere un cliente compatible; al 25 de noviembre de 2026 está llegando a algunos beta testers de Android `2.26.47.1`. Para probar la conversión, los límites de tamaño y el ensamblaje sin red ejecutá `npm test` (requiere `ffmpeg` y `ffprobe`).

## 4. Desplegar y vincular WhatsApp

1. Hacé **Redeploy** después de configurar el volumen y las variables.
2. Abrí **Deployments → View Logs**.
3. Copiá el código de emparejamiento que aparecerá en los logs.
4. En WhatsApp: **Dispositivos vinculados → Vincular un dispositivo → Vincular con número de teléfono** e ingresá el código.
5. Cuando aparezca `BOT CONECTADO`, ya podés usar el bot. Después podés quitar `WHATSAPP_NUMBER`; no borres el volumen.

En **Settings → Deploy**, desactivá **Serverless** y seleccioná **Restart Policy: Always** si está disponible en tu plan. En planes que no lo permiten, dejá **On Failure**.

## Problemas comunes

- **`No hay una sesión vinculada...`**: falta `WHATSAPP_NUMBER` o el volumen no está montado en `/data`.
- **Permiso denegado al escribir en `/data`**: agregá `RAILWAY_RUN_UID=0` y redesplegá.
- **`ffmpeg: not found`**: falta `RAILPACK_DEPLOY_APT_PACKAGES=ffmpeg`; agregala y hacé un despliegue nuevo.
- **No aparece el código**: revisá que `usePairingCode` sea `true` en `config.js`, que `WHATSAPP_NUMBER` esté configurado y que no exista una sesión previa válida.
- **La sesión desaparece al actualizar**: confirmá que el volumen siga conectado al **mismo servicio** y montado en `/data`, que el inicio sea solo `npm start` y que haya una réplica. En los logs, `[ALMACENAMIENTO] Sesión de WhatsApp` debe mostrar `/data/sessions/main`.
- **Error 401 con una sesión ya registrada**: el bot conserva los archivos para no perder el vínculo por un fallo transitorio. Revisá primero que no haya otra réplica o servicio usando esas credenciales. Borrá `/data/sessions/main` manualmente **solo si realmente desvinculaste el bot en WhatsApp**; después vinculá otra vez y restaurá el inicio normal `npm start`.
