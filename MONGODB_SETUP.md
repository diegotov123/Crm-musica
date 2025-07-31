# MongoDB Atlas Configuration Guide

## Pasos para configurar MongoDB Atlas:

### 1. Crear cuenta y cluster:
1. Ve a https://cloud.mongodb.com
2. Crea una cuenta gratuita
3. Crea un nuevo cluster (selecciona la opción gratuita M0)
4. Espera a que se complete la configuración (2-3 minutos)

### 2. Configurar acceso:
1. **Database Access**: 
   - Crea un usuario de base de datos
   - Usuario: `ventas_user`
   - Password: (genera una contraseña segura)
   - Roles: `Read and write to any database`

2. **Network Access**:
   - Añade dirección IP: `0.0.0.0/0` (permitir desde cualquier lugar)
   - Esto es necesario para Railway/Vercel

### 3. Obtener connection string:
1. Click en "Connect" en tu cluster
2. Selecciona "Connect your application"
3. Copia el connection string
4. Reemplaza `<password>` con tu contraseña
5. Reemplaza `<dbname>` con `ventas_music_db`

### 4. Connection string ejemplo:
```
mongodb+srv://ventas_user:TU_PASSWORD@cluster0.xxxxx.mongodb.net/ventas_music_db?retryWrites=true&w=majority
```

### 5. Configurar en Railway:
- Variable: `MONGO_URL`
- Valor: Tu connection string completo

## Migración de datos (opcional):
Si tienes datos locales que quieres migrar, puedes usar MongoDB Compass para exportar/importar colecciones.