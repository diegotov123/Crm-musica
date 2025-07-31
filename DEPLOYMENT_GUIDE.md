# 🚀 Guía Completa de Deployment

## Paso 1: Preparar MongoDB Atlas (15 minutos)
1. Sigue las instrucciones en `MONGODB_SETUP.md`
2. Obtén tu connection string
3. Guárdalo para el paso 3

## Paso 2: Subir código a GitHub (2 minutos)
1. En Emergent, haz clic en **"Save to GitHub"**
2. Nombra tu repositorio: `ventas-music-app`
3. Asegúrate de que sea público o conecta tu cuenta GitHub a Vercel/Railway

## Paso 3: Deploy Backend en Railway (10 minutos)
1. Ve a [railway.app](https://railway.app)
2. Conecta tu cuenta GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Selecciona tu repositorio `ventas-music-app`
5. **Configuración importante:**
   - **Root Directory**: Deja vacío (usará railway.json)
   - **Build Command**: Se configurará automáticamente
   - **Start Command**: Se configurará automáticamente

6. **Variables de entorno en Railway:**
   ```
   MONGO_URL=tu_connection_string_de_mongodb_atlas
   PORT=8001
   ```

7. Espera el deployment (5-8 minutos)
8. **Copia la URL del backend** (ej: `https://tu-app.railway.app`)

## Paso 4: Deploy Frontend en Vercel (5 minutos)
1. Ve a [vercel.com](https://vercel.com)
2. Conecta tu cuenta GitHub
3. Click "New Project"
4. Selecciona tu repositorio `ventas-music-app`
5. **Configuración del proyecto:**
   - **Framework Preset**: React
   - **Root Directory**: `frontend`
   - **Build Command**: `yarn build`
   - **Output Directory**: `build`

6. **Variables de entorno en Vercel:**
   ```
   REACT_APP_BACKEND_URL=https://tu-app.railway.app
   ```
   (Usa la URL que copiaste del paso 3)

7. Click "Deploy"
8. Espera el deployment (3-5 minutos)

## Paso 5: Verificar funcionamiento
1. **Frontend**: Tu app estará en `https://tu-app.vercel.app`
2. **Backend**: Prueba `https://tu-app.railway.app/docs`
3. **Prueba completa**:
   - Login con usuario: `indigena` / password: `careplancha123`
   - Crear una venta de prueba
   - Subir un archivo de audio
   - Verificar descarga

## 🔧 Solución de problemas comunes:

### Error de CORS:
- Verifica que `REACT_APP_BACKEND_URL` en Vercel apunte a tu Railway URL
- No incluyas trailing slash (/) al final de la URL

### Error de base de datos:
- Verifica que `MONGO_URL` en Railway sea correcta
- Asegúrate de que el IP `0.0.0.0/0` esté permitido en MongoDB Atlas

### Error 500 en Railway:
- Revisa los logs en Railway dashboard
- Verifica que todas las dependencias estén en `requirements.txt`

## 📊 Costos estimados:
- **MongoDB Atlas**: Gratis (cluster M0)
- **Railway**: ~$5-10/mes (según uso)
- **Vercel**: Gratis para uso personal

## 🎉 ¡Listo!
Tu aplicación estará funcionando en:
- Frontend: Vercel
- Backend: Railway  
- Database: MongoDB Atlas

Total de deployment: ~30-40 minutos