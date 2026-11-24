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
WHATSAPP_NUMBER=tu_numero_sin_+
RAILPACK_DEPLOY_APT_PACKAGES=ffmpeg
```

`WHATSAPP_NUMBER` es el número de la cuenta que hará de bot y solo se necesita para la primera vinculación. `NVIDIA_API_KEY`, `ATERNOS_SERVER_HOST` y `ATERNOS_SERVER_PORT` siguen siendo opcionales.

Railway usa **Railpack** por defecto. La variable `RAILPACK_DEPLOY_APT_PACKAGES` instala FFmpeg en la imagen final. El comando de inicio se detecta desde `package.json`; si Railway lo solicita, usá:

```bash
npm start
```

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
- **No aparece el código**: revisá que `usePairingCode` sea `true` en `config.js` y reiniciá el despliegue.
- **La sesión desaparece al actualizar**: confirmá que el volumen siga conectado al mismo servicio y montado en `/data`.
