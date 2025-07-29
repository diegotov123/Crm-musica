from fastapi import FastAPI, HTTPException, Depends, status, File, UploadFile, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pymongo import MongoClient
import os
import jwt
import bcrypt
from datetime import datetime, timedelta
import pandas as pd
from typing import Optional, List
import uuid
from pydantic import BaseModel
import tempfile
import io
import shutil

# Initialize FastAPI app
app = FastAPI()

# Create uploads directory
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client['ventas_music_db']
users_collection = db['users']
ventas_collection = db['ventas']

# Security
security = HTTPBearer()
SECRET_KEY = "ventas_music_secret_key_2024"
ALGORITHM = "HS256"

# Models
class LoginRequest(BaseModel):
    username: str
    password: str

class VentaModel(BaseModel):
    id: Optional[str] = None
    fecha: str
    nombre: str
    celular: str
    paquete: str
    estilo: str
    valor: float
    estado: str
    texto_cancion: str
    observacion: str = ""
    link_descarga: str = ""
    audio_filename: str = ""
    audio_original_name: str = ""
    audio_size: int = 0

class VentaResponse(BaseModel):
    id: str
    fecha: str
    nombre: str
    celular: str
    paquete: str
    estilo: str
    valor: float
    estado: str
    texto_cancion: str
    observacion: str
    link_descarga: str
    audio_filename: str
    audio_original_name: str = ""
    audio_size: int = 0

# Initialize default user
def init_default_user():
    existing_user = users_collection.find_one({"username": "indigena"})
    if not existing_user:
        hashed_password = bcrypt.hashpw("careplancha123".encode('utf-8'), bcrypt.gensalt())
        users_collection.insert_one({
            "id": str(uuid.uuid4()),
            "username": "indigena",
            "password": hashed_password,
            "created_at": datetime.now()
        })
        print("Default user created successfully")

# Fix data integrity
def fix_data_integrity():
    """Fix any records with null or missing IDs and audio_filename field"""
    try:
        # Find records with null or missing id
        null_id_records = ventas_collection.find({"$or": [{"id": None}, {"id": {"$exists": False}}]})
        count_ids = 0
        for record in null_id_records:
            new_id = str(uuid.uuid4())
            ventas_collection.update_one(
                {"_id": record["_id"]}, 
                {"$set": {"id": new_id}}
            )
            count_ids += 1
        
        if count_ids > 0:
            print(f"Fixed {count_ids} records with null/missing IDs")
        
        # Find records with missing audio_filename field  
        missing_audio_records = ventas_collection.find({"audio_filename": {"$exists": False}})
        count_audio = 0
        for record in missing_audio_records:
            ventas_collection.update_one(
                {"_id": record["_id"]}, 
                {"$set": {"audio_filename": ""}}
            )
            count_audio += 1
        
        if count_audio > 0:
            print(f"Fixed {count_audio} records with missing audio_filename field")
            
    except Exception as e:
        print(f"Error fixing data integrity: {e}")

# JWT functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return username
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# Import Excel data
def import_excel_data():
    try:
        # Check if data already imported
        if ventas_collection.count_documents({}) > 0:
            return
        
        df = pd.read_excel('/app/ventas_music.xlsx', sheet_name='VENTAS MUSIC DT')
        df_clean = df.dropna(how='all')
        
        ventas_data = []
        for _, row in df_clean.iterrows():
            # Skip header rows and invalid data
            if pd.isna(row.iloc[1]) or str(row.iloc[0]).startswith('Cierre'):
                continue
                
            try:
                fecha = row.iloc[0]
                if isinstance(fecha, datetime):
                    fecha_str = fecha.strftime('%Y-%m-%d')
                else:
                    fecha_str = str(fecha) if not pd.isna(fecha) else datetime.now().strftime('%Y-%m-%d')
                
                venta = {
                    "id": str(uuid.uuid4()),
                    "fecha": fecha_str,
                    "nombre": str(row.iloc[1]) if not pd.isna(row.iloc[1]) else "",
                    "celular": str(row.iloc[2]) if not pd.isna(row.iloc[2]) else "",
                    "paquete": str(row.iloc[3]) if not pd.isna(row.iloc[3]) else "",
                    "estilo": str(row.iloc[4]) if not pd.isna(row.iloc[4]) else "",
                    "valor": float(row.iloc[5]) if not pd.isna(row.iloc[5]) else 0.0,
                    "estado": str(row.iloc[6]) if not pd.isna(row.iloc[6]) else "",
                    "texto_cancion": str(row.iloc[7]) if not pd.isna(row.iloc[7]) else "",
                    "observacion": str(row.iloc[8]) if not pd.isna(row.iloc[8]) else "",
                    "link_descarga": str(row.iloc[9]) if not pd.isna(row.iloc[9]) else "",
                    "audio_filename": "",  # Initially empty for imported data
                    "audio_original_name": "",
                    "audio_size": 0,
                    "created_at": datetime.now()
                }
                
                # Only add if has valid data
                if venta["nombre"] and venta["celular"]:
                    ventas_data.append(venta)
                    
            except Exception as e:
                print(f"Error processing row: {e}")
                continue
        
        if ventas_data:
            ventas_collection.insert_many(ventas_data)
            print(f"Imported {len(ventas_data)} ventas records")
    except Exception as e:
        print(f"Error importing Excel data: {e}")

# Routes
@app.on_event("startup")
async def startup_event():
    init_default_user()
    import_excel_data()
    fix_data_integrity()

@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.post("/api/login")
async def login(request: LoginRequest):
    user = users_collection.find_one({"username": request.username})
    if not user or not bcrypt.checkpw(request.password.encode('utf-8'), user['password']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/ventas", response_model=List[VentaResponse])
async def get_ventas(current_user: str = Depends(verify_token)):
    try:
        ventas = list(ventas_collection.find({}, {"_id": 0}))
        # Filter out any records that might still have null IDs
        valid_ventas = [v for v in ventas if v.get('id') is not None]
        return valid_ventas
    except Exception as e:
        print(f"Error in get_ventas: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving ventas")

@app.post("/api/ventas", response_model=VentaResponse)
async def create_venta(venta: VentaModel, current_user: str = Depends(verify_token)):
    venta_dict = venta.dict()
    venta_dict["id"] = str(uuid.uuid4())
    venta_dict["created_at"] = datetime.now()
    
    ventas_collection.insert_one(venta_dict)
    return venta_dict

@app.post("/api/ventas/{venta_id}/upload-audio")
async def upload_audio(
    venta_id: str,
    audio_file: UploadFile = File(...),
    current_user: str = Depends(verify_token)
):
    """Upload audio file for a specific venta"""
    # Validate venta exists
    venta = ventas_collection.find_one({"id": venta_id})
    if not venta:
        raise HTTPException(status_code=404, detail="Venta not found")
    
    # Validate file type (audio files)
    allowed_extensions = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac']
    file_extension = os.path.splitext(audio_file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    try:
        # Generate unique filename - always save with original extension but provide as MP3 on download
        unique_filename = f"{venta_id}_{uuid.uuid4().hex}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
        
        # Update venta with audio filename
        ventas_collection.update_one(
            {"id": venta_id},
            {"$set": {
                "audio_filename": unique_filename,
                "audio_original_name": audio_file.filename,
                "audio_size": os.path.getsize(file_path),
                "updated_at": datetime.now()
            }}
        )
        
        return {
            "message": "Audio file uploaded successfully",
            "filename": unique_filename,
            "original_filename": audio_file.filename,
            "download_note": "File will be available as MP3 format when downloaded"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@app.get("/api/ventas/{venta_id}/download-audio")
async def download_audio(venta_id: str, current_user: str = Depends(verify_token)):
    """Download audio file for a specific venta"""
    # Get venta with audio filename
    venta = ventas_collection.find_one({"id": venta_id})
    if not venta:
        raise HTTPException(status_code=404, detail="Venta not found")
    
    audio_filename = venta.get("audio_filename")
    if not audio_filename:
        raise HTTPException(status_code=404, detail="No audio file found for this venta")
    
    file_path = os.path.join(UPLOAD_DIR, audio_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio file not found on disk")
    
    # Create a clean filename for download - always as MP3
    try:
        cliente_name = venta.get('nombre', 'cliente').strip()
        estilo = venta.get('estilo', 'cancion').strip()
        
        # Clean the filename by removing special characters
        import re
        cliente_clean = re.sub(r'[^\w\s-]', '', cliente_name).strip()
        cliente_clean = re.sub(r'[-\s]+', '_', cliente_clean)
        
        estilo_clean = re.sub(r'[^\w\s-]', '', estilo).strip()
        estilo_clean = re.sub(r'[-\s]+', '_', estilo_clean)
        
        download_filename = f"{cliente_clean}_{estilo_clean}.mp3"
        
        # Ensure filename is not empty
        if not cliente_clean or cliente_clean == '_':
            download_filename = f"audio_venta_{venta_id[:8]}.mp3"
        
        print(f"Downloading audio: {audio_filename} as {download_filename}")
        
        return FileResponse(
            path=file_path,
            filename=download_filename,
            media_type='audio/mpeg',
            headers={
                "Content-Disposition": f'attachment; filename="{download_filename}"',
                "Content-Type": "audio/mpeg",
                "Cache-Control": "no-cache"
            }
        )
    except Exception as e:
        print(f"Error creating download filename: {e}")
        # Fallback filename
        download_filename = f"audio_venta_{venta_id[:8]}.mp3"
        return FileResponse(
            path=file_path,
            filename=download_filename,
            media_type='audio/mpeg',
            headers={
                "Content-Disposition": f'attachment; filename="{download_filename}"',
                "Content-Type": "audio/mpeg"
            }
        )

@app.delete("/api/ventas/{venta_id}/audio")
async def delete_audio(venta_id: str, current_user: str = Depends(verify_token)):
    """Delete audio file for a specific venta"""
    venta = ventas_collection.find_one({"id": venta_id})
    if not venta:
        raise HTTPException(status_code=404, detail="Venta not found")
    
    audio_filename = venta.get("audio_filename")
    if not audio_filename:
        raise HTTPException(status_code=404, detail="No audio file found for this venta")
    
    try:
        file_path = os.path.join(UPLOAD_DIR, audio_filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Update venta to remove audio filename
        ventas_collection.update_one(
            {"id": venta_id},
            {"$set": {"audio_filename": "", "updated_at": datetime.now()}}
        )
        
        return {"message": "Audio file deleted successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

@app.put("/api/ventas/{venta_id}", response_model=VentaResponse)
async def update_venta(venta_id: str, venta: VentaModel, current_user: str = Depends(verify_token)):
    venta_dict = venta.dict()
    venta_dict["id"] = venta_id  # Preserve the ID
    venta_dict["updated_at"] = datetime.now()
    
    result = ventas_collection.update_one(
        {"id": venta_id},
        {"$set": venta_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Venta not found")
    
    updated_venta = ventas_collection.find_one({"id": venta_id}, {"_id": 0})
    return updated_venta

@app.delete("/api/ventas/{venta_id}")
async def delete_venta(venta_id: str, current_user: str = Depends(verify_token)):
    result = ventas_collection.delete_one({"id": venta_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Venta not found")
    return {"message": "Venta deleted successfully"}

@app.get("/api/stats")
async def get_stats(current_user: str = Depends(verify_token)):
    total_ventas = ventas_collection.count_documents({})
    
    # Total ingresos
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$valor"}}}]
    result = list(ventas_collection.aggregate(pipeline))
    total_ingresos = result[0]["total"] if result else 0
    
    # Ventas por estado
    pipeline_estado = [
        {"$group": {"_id": "$estado", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    ventas_por_estado = list(ventas_collection.aggregate(pipeline_estado))
    
    # Ventas por estilo
    pipeline_estilo = [
        {"$group": {"_id": "$estilo", "count": {"$sum": 1}, "total_valor": {"$sum": "$valor"}}},
        {"$sort": {"count": -1}}
    ]
    ventas_por_estilo = list(ventas_collection.aggregate(pipeline_estilo))
    
    # Ingresos por día
    pipeline_ingresos_dia = [
        {
            "$group": {
                "_id": "$fecha",
                "ingresos": {"$sum": "$valor"},
                "cantidad": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    ingresos_por_dia = list(ventas_collection.aggregate(pipeline_ingresos_dia))
    
    # Top clientes
    pipeline_clientes = [
        {
            "$group": {
                "_id": "$nombre",
                "total_gastado": {"$sum": "$valor"},
                "cantidad_pedidos": {"$sum": 1}
            }
        },
        {"$sort": {"total_gastado": -1}},
        {"$limit": 5}
    ]
    top_clientes = list(ventas_collection.aggregate(pipeline_clientes))
    
    # Ingresos por mes
    pipeline_mes = [
        {
            "$addFields": {
                "fecha_obj": {"$dateFromString": {"dateString": "$fecha"}}
            }
        },
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$fecha_obj"},
                    "month": {"$month": "$fecha_obj"}
                },
                "ingresos": {"$sum": "$valor"},
                "cantidad": {"$sum": 1}
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1}}
    ]
    ingresos_por_mes = list(ventas_collection.aggregate(pipeline_mes))
    
    return {
        "total_ventas": total_ventas,
        "total_ingresos": total_ingresos,
        "ventas_por_estado": ventas_por_estado,
        "ventas_por_estilo": ventas_por_estilo,
        "ingresos_por_dia": ingresos_por_dia,
        "top_clientes": top_clientes,
        "ingresos_por_mes": ingresos_por_mes
    }

@app.post("/api/upload-excel")
async def upload_excel(file: UploadFile = File(...), current_user: str = Depends(verify_token)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be Excel format")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), sheet_name='VENTAS MUSIC DT')
        df_clean = df.dropna(how='all')
        
        imported_count = 0
        for _, row in df_clean.iterrows():
            if pd.isna(row.iloc[1]) or str(row.iloc[0]).startswith('Cierre'):
                continue
                
            try:
                fecha = row.iloc[0]
                if isinstance(fecha, datetime):
                    fecha_str = fecha.strftime('%Y-%m-%d')
                else:
                    fecha_str = str(fecha) if not pd.isna(fecha) else datetime.now().strftime('%Y-%m-%d')
                
                venta = {
                    "id": str(uuid.uuid4()),
                    "fecha": fecha_str,
                    "nombre": str(row.iloc[1]) if not pd.isna(row.iloc[1]) else "",
                    "celular": str(row.iloc[2]) if not pd.isna(row.iloc[2]) else "",
                    "paquete": str(row.iloc[3]) if not pd.isna(row.iloc[3]) else "",
                    "estilo": str(row.iloc[4]) if not pd.isna(row.iloc[4]) else "",
                    "valor": float(row.iloc[5]) if not pd.isna(row.iloc[5]) else 0.0,
                    "estado": str(row.iloc[6]) if not pd.isna(row.iloc[6]) else "",
                    "texto_cancion": str(row.iloc[7]) if not pd.isna(row.iloc[7]) else "",
                    "observacion": str(row.iloc[8]) if not pd.isna(row.iloc[8]) else "",
                    "link_descarga": str(row.iloc[9]) if not pd.isna(row.iloc[9]) else "",
                    "audio_filename": "",  # Initially empty for imported data
                    "audio_original_name": "",
                    "audio_size": 0,
                    "created_at": datetime.now()
                }
                
                if venta["nombre"] and venta["celular"]:
                    ventas_collection.insert_one(venta)
                    imported_count += 1
                    
            except Exception as e:
                print(f"Error processing row: {e}")
                continue
        
        return {"message": f"Successfully imported {imported_count} records"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)