#!/usr/bin/env python3
"""
Frontend Simulation Test - Simulates exactly what the frontend does
Tests the specific issue: "Error al guardar la venta" from frontend
"""

import requests
import json
from datetime import datetime

def test_frontend_create_venta_simulation():
    """Simulate exactly what the frontend does when creating a venta"""
    base_url = "https://archivo-error.emergent.host"
    
    print("🎯 FRONTEND SIMULATION TEST")
    print("=" * 50)
    
    # Step 1: Login (same as frontend)
    print("\n1️⃣ Testing Login...")
    login_payload = {
        "username": "indigena",
        "password": "careplancha123"
    }
    
    try:
        login_response = requests.post(
            f"{base_url}/api/login",
            json=login_payload,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout=10
        )
        
        print(f"   Status: {login_response.status_code}")
        print(f"   Headers: {dict(login_response.headers)}")
        
        if login_response.status_code != 200:
            print(f"   ❌ Login failed: {login_response.text}")
            return False
            
        token_data = login_response.json()
        token = token_data.get('access_token')
        
        if not token:
            print(f"   ❌ No token in response: {token_data}")
            return False
            
        print(f"   ✅ Login successful, token: {token[:20]}...")
        
    except Exception as e:
        print(f"   ❌ Login error: {e}")
        return False
    
    # Step 2: Create venta (exactly like frontend would)
    print("\n2️⃣ Testing Create Venta (Frontend Style)...")
    
    # This is the exact payload structure the frontend would send
    venta_payload = {
        "fecha": datetime.now().strftime('%Y-%m-%d'),
        "nombre": "Cliente Prueba Frontend",
        "celular": "3001234567",
        "paquete": "Canción personalizada",
        "estilo": "Vallenato",
        "valor": 25000.0,
        "estado": "Pendiente de pago",
        "texto_cancion": "Quiero una canción para mi mamá",
        "observacion": "Cliente nuevo, primera compra",
        "link_descarga": "",
        "audio_filename": "",
        "audio_original_name": "",
        "audio_extension": "",
        "audio_size": 0,
        "confirmacion_pago_imagen": ""
    }
    
    try:
        # Headers exactly as frontend would send
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': 'https://archivo-error.emergent.host',
            'Referer': 'https://archivo-error.emergent.host/'
        }
        
        print(f"   Payload: {json.dumps(venta_payload, indent=2)}")
        print(f"   Headers: {headers}")
        
        create_response = requests.post(
            f"{base_url}/api/ventas",
            json=venta_payload,
            headers=headers,
            timeout=10
        )
        
        print(f"   Status: {create_response.status_code}")
        print(f"   Response Headers: {dict(create_response.headers)}")
        
        if create_response.status_code == 200:
            response_data = create_response.json()
            print(f"   ✅ Venta created successfully!")
            print(f"   Response: {json.dumps(response_data, indent=2)}")
            
            # Verify the created venta
            venta_id = response_data.get('id')
            if venta_id:
                print(f"   ✅ Venta ID: {venta_id}")
                return True
            else:
                print(f"   ❌ No ID in response")
                return False
        else:
            print(f"   ❌ Create venta failed!")
            print(f"   Status: {create_response.status_code}")
            print(f"   Response: {create_response.text}")
            
            # Try to parse error response
            try:
                error_data = create_response.json()
                print(f"   Error details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"   Raw response: {create_response.text}")
            
            return False
            
    except Exception as e:
        print(f"   ❌ Create venta error: {e}")
        return False

def test_cors_preflight():
    """Test CORS preflight request exactly as browser would send"""
    base_url = "https://archivo-error.emergent.host"
    
    print("\n3️⃣ Testing CORS Preflight (Browser Simulation)...")
    
    try:
        # Preflight request exactly as browser sends
        preflight_headers = {
            'Origin': 'https://archivo-error.emergent.host',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'authorization,content-type',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Dest': 'empty'
        }
        
        response = requests.options(
            f"{base_url}/api/ventas",
            headers=preflight_headers,
            timeout=10
        )
        
        print(f"   Status: {response.status_code}")
        print(f"   Response Headers: {dict(response.headers)}")
        
        # Check required CORS headers
        cors_origin = response.headers.get('Access-Control-Allow-Origin')
        cors_methods = response.headers.get('Access-Control-Allow-Methods')
        cors_headers = response.headers.get('Access-Control-Allow-Headers')
        cors_credentials = response.headers.get('Access-Control-Allow-Credentials')
        
        print(f"   CORS Origin: {cors_origin}")
        print(f"   CORS Methods: {cors_methods}")
        print(f"   CORS Headers: {cors_headers}")
        print(f"   CORS Credentials: {cors_credentials}")
        
        if response.status_code in [200, 204] and cors_origin:
            print(f"   ✅ CORS preflight successful")
            return True
        else:
            print(f"   ❌ CORS preflight failed")
            return False
            
    except Exception as e:
        print(f"   ❌ CORS preflight error: {e}")
        return False

def main():
    """Run frontend simulation tests"""
    print("🚀 FRONTEND SIMULATION TESTS")
    print("Testing the exact issue: 'Error al guardar la venta'")
    print("=" * 60)
    
    # Test CORS first
    cors_success = test_cors_preflight()
    
    # Test create venta
    create_success = test_frontend_create_venta_simulation()
    
    print("\n" + "=" * 60)
    print("📊 SIMULATION RESULTS:")
    print(f"   CORS Preflight: {'✅ PASS' if cors_success else '❌ FAIL'}")
    print(f"   Create Venta: {'✅ PASS' if create_success else '❌ FAIL'}")
    
    if cors_success and create_success:
        print("\n🎉 BACKEND IS WORKING CORRECTLY!")
        print("✅ The issue is likely in the frontend error handling or request format")
        print("✅ Backend API accepts venta creation requests properly")
        return 0
    else:
        print("\n❌ BACKEND ISSUES FOUND!")
        print("🔍 These issues could cause 'Error al guardar la venta' in frontend")
        return 1

if __name__ == "__main__":
    exit(main())