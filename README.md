# Ventas Music - Sistema de Gestión de Ventas Musicales

Sistema completo para gestionar ventas de música personalizada con subida de archivos de audio y confirmaciones de pago.

## 🚀 Stack Tecnológico

- **Frontend**: React + Tailwind CSS
- **Backend**: FastAPI + Python
- **Database**: MongoDB
- **File Storage**: Sistema de archivos local (configurable para cloud)

## 📦 Deployment

### Opción 1: Vercel + Railway (Recomendado)

#### Frontend en Vercel:
1. Conecta tu repositorio de GitHub a Vercel
2. Configuración del proyecto:
   - **Framework**: React
   - **Build Command**: `cd frontend && yarn build`
   - **Output Directory**: `frontend/build`
   - **Install Command**: `cd frontend && yarn install`

3. Variables de entorno en Vercel:
   ```
   REACT_APP_BACKEND_URL=https://tu-app-backend.railway.app
   ```

#### Backend en Railway:
1. Conecta tu repositorio a Railway
2. Selecciona la carpeta `backend/`
3. Variables de entorno en Railway:
   ```
   MONGO_URL=mongodb+srv://usuario:password@cluster.mongodb.net/ventas_music_db
   PORT=8001
   ```

#### Base de datos - MongoDB Atlas:
1. Crea cuenta en [MongoDB Atlas](https://cloud.mongodb.com)
2. Crea un cluster gratuito
3. Obtén tu connection string
4. Actualiza `MONGO_URL` en Railway

### Opción 2: Deployment en Emergent
- Costo: 50 créditos por mes
- Deployment completo con un clic
- Infraestructura administrada

## 🛠️ Desarrollo Local

### Prerequisitos:
- Node.js 16+
- Python 3.8+
- MongoDB (local o Atlas)

### Instalación:

1. **Backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn server:app --reload --host 0.0.0.0 --port 8001
   ```

2. **Frontend:**
   ```bash
   cd frontend
   yarn install
   yarn start
   ```

3. **Variables de entorno:**
   - Copia `.env.example` y configura las variables necesarias

## 📋 Funcionalidades

- ✅ Gestión completa de ventas
- ✅ Subida de archivos de audio (múltiples formatos)
- ✅ Confirmaciones de pago con imágenes
- ✅ Dashboard con estadísticas
- ✅ Import/Export de Excel
- ✅ Autenticación JWT
- ✅ Diseño responsive

## 🔧 Configuración de Variables de Entorno

Ver archivo `.env.example` para la configuración completa de variables de entorno.

## 📂 Estructura del Proyecto

```
/
├── frontend/          # React frontend
├── backend/           # FastAPI backend
├── uploads/           # Archivos subidos (local)
├── vercel.json        # Configuración para Vercel
├── railway.json       # Configuración para Railway
└── .env.example       # Template de variables de entorno
```

## 🚀 Scripts de Deployment

Los archivos de configuración incluyen:
- `vercel.json`: Configuración optimizada para Vercel
- `railway.json`: Configuración para Railway
- Variables de entorno pre-configuradas

## 📞 Soporte

Para soporte con el deployment o funcionalidades, contacta al desarrollador.
