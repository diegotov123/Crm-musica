#!/usr/bin/env python3
"""
Backend API Testing for Ventas Music DT System
Tests all API endpoints using the public URL
"""

import requests
import sys
import json
from datetime import datetime

class VentasMusicAPITester:
    def __init__(self, base_url="https://9ea15b56-e88a-4ed4-8af9-8a7520b9e845.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_venta_id = None

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")

    def test_health_endpoint(self):
        """Test the health endpoint"""
        try:
            response = requests.get(f"{self.base_url}/api/health", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Response: {data}"
            self.log_test("Health Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Health Endpoint", False, f"Error: {str(e)}")
            return False

    def test_login(self, username="indigena", password="careplancha123"):
        """Test login endpoint and store token"""
        try:
            payload = {"username": username, "password": password}
            response = requests.post(
                f"{self.base_url}/api/login",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if 'access_token' in data:
                    self.token = data['access_token']
                    details += f", Token received: {self.token[:20]}..."
                else:
                    success = False
                    details += ", No access_token in response"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text}"
                    
            self.log_test("Login", success, details)
            return success
        except Exception as e:
            self.log_test("Login", False, f"Error: {str(e)}")
            return False

    def test_get_ventas(self):
        """Test getting ventas list"""
        if not self.token:
            self.log_test("Get Ventas", False, "No token available")
            return False
            
        try:
            headers = {
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            }
            response = requests.get(f"{self.base_url}/api/ventas", headers=headers, timeout=10)
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Found {len(data)} ventas"
                if len(data) > 0:
                    details += f", First venta: {data[0].get('nombre', 'N/A')}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text}"
                    
            self.log_test("Get Ventas", success, details)
            return success
        except Exception as e:
            self.log_test("Get Ventas", False, f"Error: {str(e)}")
            return False

    def test_get_stats(self):
        """Test getting statistics"""
        if not self.token:
            self.log_test("Get Stats", False, "No token available")
            return False
            
        try:
            headers = {
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            }
            response = requests.get(f"{self.base_url}/api/stats", headers=headers, timeout=10)
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Total ventas: {data.get('total_ventas', 0)}"
                details += f", Total ingresos: {data.get('total_ingresos', 0)}"
                details += f", Estados: {len(data.get('ventas_por_estado', []))}"
                details += f", Estilos: {len(data.get('ventas_por_estilo', []))}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text}"
                    
            self.log_test("Get Stats", success, details)
            return success
        except Exception as e:
            self.log_test("Get Stats", False, f"Error: {str(e)}")
            return False

    def test_create_venta(self):
        """Test creating a new venta"""
        if not self.token:
            self.log_test("Create Venta", False, "No token available")
            return False
            
        try:
            test_venta = {
                "fecha": datetime.now().strftime('%Y-%m-%d'),
                "nombre": "Test Cliente API",
                "celular": "3001234567",
                "paquete": "Canción personalizada de prueba",
                "estilo": "Vallenato",
                "valor": 25000.0,
                "estado": "Pagada y en producción",
                "texto_cancion": "Esta es una canción de prueba para el API testing",
                "observacion": "Venta creada por test automatizado",
                "link_descarga": "https://test.com/download"
            }
            
            headers = {
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            }
            response = requests.post(
                f"{self.base_url}/api/ventas",
                json=test_venta,
                headers=headers,
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if 'id' in data:
                    self.test_venta_id = data['id']
                    details += f", Created venta ID: {self.test_venta_id}"
                    details += f", Cliente: {data.get('nombre', 'N/A')}"
                else:
                    success = False
                    details += ", No ID in response"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text}"
                    
            self.log_test("Create Venta", success, details)
            return success
        except Exception as e:
            self.log_test("Create Venta", False, f"Error: {str(e)}")
            return False

    def test_update_venta(self):
        """Test updating a venta"""
        if not self.token or not self.test_venta_id:
            self.log_test("Update Venta", False, "No token or venta ID available")
            return False
            
        try:
            updated_venta = {
                "fecha": datetime.now().strftime('%Y-%m-%d'),
                "nombre": "Test Cliente API UPDATED",
                "celular": "3001234567",
                "paquete": "Canción personalizada actualizada",
                "estilo": "Ranchera",
                "valor": 30000.0,
                "estado": "entregada",
                "texto_cancion": "Esta es una canción de prueba ACTUALIZADA",
                "observacion": "Venta actualizada por test automatizado",
                "link_descarga": "https://test-updated.com/download"
            }
            
            headers = {
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            }
            response = requests.put(
                f"{self.base_url}/api/ventas/{self.test_venta_id}",
                json=updated_venta,
                headers=headers,
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Updated venta: {data.get('nombre', 'N/A')}"
                details += f", New estado: {data.get('estado', 'N/A')}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text}"
                    
            self.log_test("Update Venta", success, details)
            return success
        except Exception as e:
            self.log_test("Update Venta", False, f"Error: {str(e)}")
            return False

    def test_delete_venta(self):
        """Test deleting a venta"""
        if not self.token or not self.test_venta_id:
            self.log_test("Delete Venta", False, "No token or venta ID available")
            return False
            
        try:
            headers = {
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            }
            response = requests.delete(
                f"{self.base_url}/api/ventas/{self.test_venta_id}",
                headers=headers,
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                try:
                    data = response.json()
                    details += f", Message: {data.get('message', 'N/A')}"
                except:
                    details += ", Deletion successful"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text}"
                    
            self.log_test("Delete Venta", success, details)
            return success
        except Exception as e:
            self.log_test("Delete Venta", False, f"Error: {str(e)}")
            return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        try:
            payload = {"username": "invalid", "password": "wrong"}
            response = requests.post(
                f"{self.base_url}/api/login",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 401
            details = f"Status: {response.status_code} (Expected 401)"
            
            self.log_test("Invalid Login", success, details)
            return success
        except Exception as e:
            self.log_test("Invalid Login", False, f"Error: {str(e)}")
            return False

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        try:
            response = requests.get(f"{self.base_url}/api/ventas", timeout=10)
            
            success = response.status_code == 403
            details = f"Status: {response.status_code} (Expected 403)"
            
            self.log_test("Unauthorized Access", success, details)
            return success
        except Exception as e:
            self.log_test("Unauthorized Access", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Ventas Music DT API Tests")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Basic connectivity tests
        print("\n📋 Basic Connectivity Tests:")
        self.test_health_endpoint()
        
        # Authentication tests
        print("\n🔐 Authentication Tests:")
        self.test_invalid_login()
        self.test_unauthorized_access()
        self.test_login()
        
        # Protected endpoint tests
        print("\n📊 Protected Endpoint Tests:")
        self.test_get_ventas()
        self.test_get_stats()
        
        # CRUD operations tests
        print("\n🔄 CRUD Operations Tests:")
        self.test_create_venta()
        self.test_update_venta()
        self.test_delete_venta()
        
        # Final results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests PASSED! API is working correctly.")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests FAILED!")
            return 1

def main():
    """Main function to run tests"""
    tester = VentasMusicAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())