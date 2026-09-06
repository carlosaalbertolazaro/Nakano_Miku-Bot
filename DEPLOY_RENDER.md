# Guía de Despliegue de Miku en Render (Plan Gratuito, Sin Tarjeta)

Esta guía te permite alojar el bot en **Render** sin perder la sesión de WhatsApp ni tus datos al reiniciar, combinándolo con un cluster gratuito de **MongoDB Atlas** (ninguno de los dos servicios te pedirá tarjeta de crédito).

---

## 📌 Requisitos Previos

1. Una cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) (Gratis, sin tarjeta).
2. Una cuenta en [Render](https://render.com/) (Gratis, sin tarjeta).
   > **Nota sobre las 750 horas de Render:** Render da 750 horas gratuitas al mes por cuenta. Si ya tienes otro bot en tu cuenta de Render, te recomendamos crear una **segunda cuenta de Render** con otro correo para este bot. Así tendrás 750 horas completas solo para Miku.
3. Una cuenta en [UptimeRobot](https://uptimerobot.com/) (Gratis, sin tarjeta) para evitar que Render se duerma.

---

## Paso 1: Crear la Base de Datos en MongoDB Atlas (5 minutos)

MongoDB Atlas guardará la sesión de WhatsApp y los datos de usuarios/economía para que el disco efímero de Render no los borre.

1. Entra a [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register) y regístrate (puedes usar tu cuenta de Google).
2. Elige el plan **M0 (Free / Gratis)**:
   - Proveedor: Cualquiera (AWS o GCP recomendado).
   - Región: Elige una cercana (ej. N. Virginia `us-east-1` o São Paulo).
   - Haz clic en **Create Deployment**.
3. **Crear usuario de base de datos:**
   - Usuario: un nombre a tu elección (ej. `miku_user`).
   - Contraseña: una contraseña segura (anótala, la necesitarás).
   - Haz clic en **Create Database User**.
4. **Configurar acceso de red (Network Access):**
   - En la misma ventana o en el menú lateral **Security > Network Access**:
   - Haz clic en **Add IP Address**.
   - Selecciona **Allow Access from Anywhere** (colocará `0.0.0.0/0`). Esto es obligatorio para que los servidores de Render puedan conectarse.
   - Guarda los cambios.
5. **Obtener la URL de conexión:**
   - Ve a **Deployment > Database**.
   - Haz clic en el botón **Connect** junto a tu cluster.
   - Selecciona **Drivers** (Node.js).
   - Copia la cadena de conexión que se parece a:
     ```text
     mongodb+srv://miku_user:<db_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
     ```
   - Reemplaza `<db_password>` por la contraseña que creaste en el paso 3. Guárdate esta URL completa.

---

## Paso 2: Crear el Servicio en Render

1. Entra a tu panel en [dashboard.render.com](https://dashboard.render.com/).
2. Haz clic en **New +** y selecciona **Web Service**.
3. Conecta tu repositorio de GitHub: `Nakano_Miku-Bot`.
4. Configura los siguientes campos:
   - **Name:** `miku-bot` (o el nombre que quieras).
   - **Region:** Elige una cercana (ej. Ohio o Oregon).
   - **Branch:** ⚠️ Escribe o selecciona: `render` *(importante: para usar esta rama adaptada y dejar `main` intacto)*.
   - **Runtime:** `Node`.
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free` (0 USD/mo).
5. Despliega hacia abajo hasta la sección **Environment Variables** (Variables de entorno) y agrega las siguientes:

| Clave (Key) | Valor (Value) | Descripción |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Modo producción |
| `MONGODB_URI` | `mongodb+srv://...` | La URL completa que copiaste de MongoDB Atlas en el Paso 1 |
| `PAIRING_NUMBER` | `54911XXXXXXXX` | Tu número de WhatsApp sin signos `+` ni espacios (código de país + número) |
| `GROQ_API_KEY` | `gsk_...` | Tu API key de Groq (para la IA) |
| `NVIDIA_API_KEY` | `nvapi-...` | *(Opcional)* Clave de respaldo de IA en Nvidia NIM |
| `ATERNOS_SERVER_HOST` | `tu-servidor.aternos.me` | *(Opcional)* Host de tu server de Minecraft |

6. Haz clic en **Create Web Service**.

---

## Paso 3: Vinculación de WhatsApp (Primer Arranque)

1. En el panel de Render, entra a la pestaña **Logs**.
2. Espera a que termine la instalación (`npm install`) y arranque el bot.
3. En los logs verás una línea resaltada parecida a esta:
   ```text
   CÓDIGO DE VINCULACIÓN:  ABCD-1234
   ```
4. Abre WhatsApp en tu celular:
   - Ve a **Ajustes / Configuración > Dispositivos vinculados > Vincular un dispositivo**.
   - Toca en **Vincular con el número de teléfono** (en lugar de escanear QR).
   - Ingresa el código de 8 caracteres que viste en los logs de Render.
5. Verás en los logs:
   ```text
   ╔══════════════════════════════╗
   ║  ✅  BOT CONECTADO           ║
   ╚══════════════════════════════╝
   ```
¡Listo! La sesión quedó guardada en tu cluster de MongoDB Atlas. Si Render se reinicia o se actualiza, el bot recuperará la sesión automáticamente sin pedirte vincular de nuevo.

---

## Paso 4: Evitar que Render se duerma con UptimeRobot

Render apaga los servicios web gratuitos si no reciben visitas web durante 15 minutos. El bot incluye un servidor de salud HTTP en el puerto asignado.

1. Copia la URL pública que Render le asignó a tu servicio (arriba a la izquierda, debajo del nombre, ej. `https://miku-bot-xxxx.onrender.com`).
2. Entra a [uptimerobot.com](https://uptimerobot.com/) y regístrate gratis.
3. Haz clic en **Add New Monitor**:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `Miku WhatsApp`
   - **URL (or IP):** Pega la URL de tu bot de Render (`https://miku-bot-xxxx.onrender.com`).
   - **Monitoring Interval:** `5 minutes`
4. Haz clic en **Create Monitor**.

Con esto, UptimeRobot enviará una petición cada 5 minutos manteniendo tu bot despierto las 24 horas del día.
