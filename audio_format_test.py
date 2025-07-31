#!/usr/bin/env python3
"""
Specific test for audio format preservation as requested in the review
Tests the core functionality mentioned in the review request
"""

import requests
import tempfile
import os
from datetime import datetime

def test_audio_format_preservation():
    """Test the specific requirements from the review request"""
    
    base_url = "https://4c77c675-30aa-467f-bd5e-3d701cfd9887.preview.emergentagent.com"
    
    print("🎵 Testing Audio Format Preservation - Review Request Verification")
    print("=" * 70)
    
    # 1. Test login with specified credentials
    print("\n1️⃣ Testing login with 'indigena' and 'careplancha123'...")
    login_response = requests.post(f"{base_url}/api/login", 
                                  json={'username': 'indigena', 'password': 'careplancha123'})
    
    if login_response.status_code == 200:
        token = login_response.json()['access_token']
        print("✅ Login successful")
    else:
        print("❌ Login failed")
        return False
    
    # 2. Test GET /api/ventas
    print("\n2️⃣ Testing GET /api/ventas...")
    headers = {'Authorization': f'Bearer {token}'}
    ventas_response = requests.get(f"{base_url}/api/ventas", headers=headers)
    
    if ventas_response.status_code == 200:
        ventas = ventas_response.json()
        print(f"✅ GET /api/ventas successful - Found {len(ventas)} ventas")
    else:
        print("❌ GET /api/ventas failed")
        return False
    
    # 3. Test POST /api/ventas - create new venta
    print("\n3️⃣ Testing POST /api/ventas...")
    test_venta = {
        "fecha": datetime.now().strftime('%Y-%m-%d'),
        "nombre": "Cliente Prueba Audio",
        "celular": "3001234567",
        "paquete": "Canción personalizada",
        "estilo": "Vallenato",
        "valor": 25000.0,
        "estado": "Pagada",
        "texto_cancion": "Canción de prueba para formato de audio",
        "observacion": "Prueba de preservación de formato"
    }
    
    create_response = requests.post(f"{base_url}/api/ventas", json=test_venta, headers=headers)
    
    if create_response.status_code == 200:
        venta_data = create_response.json()
        venta_id = venta_data['id']
        print(f"✅ POST /api/ventas successful - Created venta ID: {venta_id[:8]}...")
    else:
        print("❌ POST /api/ventas failed")
        return False
    
    # 4. Test audio format preservation for different formats
    print("\n4️⃣ Testing audio format preservation...")
    
    formats_to_test = [
        ('.mp3', 'audio/mpeg', 'MP3'),
        ('.wav', 'audio/wav', 'WAV'),
        ('.m4a', 'audio/mp4', 'M4A'),
        ('.ogg', 'audio/ogg', 'OGG'),
        ('.flac', 'audio/flac', 'FLAC'),
        ('.aac', 'audio/aac', 'AAC')
    ]
    
    all_formats_passed = True
    
    for extension, expected_mime, format_name in formats_to_test:
        print(f"\n   📁 Testing {format_name} format ({extension})...")
        
        # Create temporary audio file
        with tempfile.NamedTemporaryFile(suffix=extension, delete=False) as temp_file:
            temp_file.write(f'Test audio data for {format_name} format'.encode())
            temp_file_path = temp_file.name
        
        try:
            # Upload audio file
            with open(temp_file_path, 'rb') as audio_file:
                files = {'audio_file': (f'test{extension}', audio_file, expected_mime)}
                upload_response = requests.post(
                    f"{base_url}/api/ventas/{venta_id}/upload-audio",
                    headers=headers,
                    files=files,
                    timeout=30
                )
            
            if upload_response.status_code == 200:
                upload_data = upload_response.json()
                uploaded_extension = upload_data.get('file_extension')
                
                if uploaded_extension == extension:
                    print(f"      ✅ Upload successful - Format preserved: {uploaded_extension}")
                    
                    # Test download to verify format preservation
                    download_url = f"{base_url}/api/ventas/{venta_id}/download-audio?token={token}"
                    download_response = requests.get(download_url, timeout=30)
                    
                    if download_response.status_code == 200:
                        content_type = download_response.headers.get('content-type', '')
                        content_disposition = download_response.headers.get('content-disposition', '')
                        
                        if expected_mime in content_type and extension in content_disposition:
                            print(f"      ✅ Download successful - Headers correct")
                            print(f"         Content-Type: {content_type}")
                            print(f"         Content-Disposition: {content_disposition}")
                        else:
                            print(f"      ❌ Download headers incorrect")
                            print(f"         Expected: {expected_mime}")
                            print(f"         Got: {content_type}")
                            all_formats_passed = False
                    else:
                        print(f"      ❌ Download failed: {download_response.status_code}")
                        all_formats_passed = False
                        
                else:
                    print(f"      ❌ Format not preserved - Expected: {extension}, Got: {uploaded_extension}")
                    all_formats_passed = False
            else:
                print(f"      ❌ Upload failed: {upload_response.status_code}")
                all_formats_passed = False
                
        finally:
            # Clean up temp file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    # 5. Test mobile download endpoint
    print(f"\n5️⃣ Testing mobile download endpoint...")
    mobile_url = f"{base_url}/api/ventas/{venta_id}/download-mobile?token={token}"
    mobile_response = requests.get(mobile_url, timeout=30)
    
    if mobile_response.status_code == 200:
        print("✅ Mobile download endpoint working")
        print(f"   Content-Type: {mobile_response.headers.get('content-type', 'N/A')}")
    else:
        print(f"❌ Mobile download failed: {mobile_response.status_code}")
        all_formats_passed = False
    
    # 6. Cleanup - delete test venta
    print(f"\n6️⃣ Cleaning up test venta...")
    delete_response = requests.delete(f"{base_url}/api/ventas/{venta_id}", headers=headers)
    
    if delete_response.status_code == 200:
        print("✅ Test venta deleted successfully")
    else:
        print("⚠️ Failed to delete test venta (not critical)")
    
    # Final results
    print("\n" + "=" * 70)
    if all_formats_passed:
        print("🎉 ALL AUDIO FORMAT PRESERVATION TESTS PASSED!")
        print("✅ Original formats are preserved during upload")
        print("✅ Correct headers are returned during download")
        print("✅ All required endpoints are working")
        return True
    else:
        print("❌ Some audio format tests failed")
        return False

if __name__ == "__main__":
    success = test_audio_format_preservation()
    exit(0 if success else 1)