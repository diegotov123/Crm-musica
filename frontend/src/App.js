import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loginData, setLoginData] = useState({ username: 'indigena', password: 'careplancha123' });
  const [ventas, setVentas] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [editingVenta, setEditingVenta] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterEstilo, setFilterEstilo] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // Default to newest first
  const [sortBy, setSortBy] = useState('fecha');
  const [notifications, setNotifications] = useState([]);
  const [clientesAntiguos, setClientesAntiguos] = useState([]);

  const [ventaForm, setVentaForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    nombre: '',
    celular: '',
    paquete: '',
    estilo: '',
    valor: '',
    estado: 'Pagada y en producción',
    texto_cancion: '',
    observacion: '',
    link_descarga: '',
    audio_filename: '',
    confirmacion_pago_imagen: ''
  });

  const [selectedAudioFile, setSelectedAudioFile] = useState(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (token) {
      setIsLoggedIn(true);
      fetchVentas();
      fetchStats();
      loadClientesAntiguos();
    }
  }, [token, sortOrder, sortBy]);

  const fetchVentas = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ventas?sort_order=${sortOrder}&sort_by=${sortBy}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setVentas(data);
      }
    } catch (error) {
      console.error('Error fetching ventas:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    console.log('Attempting login with:', loginData.username);
    
    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username: loginData.username.trim(),
          password: loginData.password.trim()
        }),
      });

      console.log('Login response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Login successful, setting token');
        setToken(data.access_token);
        localStorage.setItem('token', data.access_token);
        setIsLoggedIn(true);
      } else {
        const errorData = await response.text();
        console.error('Login failed:', response.status, errorData);
        alert('Credenciales inválidas. Por favor verifica usuario y contraseña.');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setLoginData({ username: '', password: '' });
  };

  const handleVentaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingVenta 
        ? `${API_BASE}/api/ventas/${editingVenta.id}` 
        : `${API_BASE}/api/ventas`;
      
      const method = editingVenta ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...ventaForm,
          valor: parseFloat(ventaForm.valor)
        })
      });

      if (response.ok) {
        const ventaData = await response.json();
        
        // If there's an audio file to upload
        if (selectedAudioFile) {
          await uploadAudioFile(ventaData.id);
          addNotification(`🎵 Nueva canción subida para ${ventaData.nombre} (${ventaData.celular})`, 'success');
        }
        
        // If there's an image file to upload
        if (selectedImageFile) {
          await uploadImageFile(ventaData.id);
          addNotification(`🖼️ Imagen de confirmación de pago subida para ${ventaData.nombre}`, 'info');
        }
        
        // Check if estado changed to "Entregado por Diegoto"
        if (editingVenta && editingVenta.estado !== ventaData.estado && ventaData.estado === 'Entregado por Diegoto') {
          addNotification(`🎤 Diego acaba de actualizar la canción con el ${ventaData.celular}`, 'delivery');
        }
        
        // General success notification
        if (!editingVenta) {
          addNotification(`✅ Nueva venta creada para ${ventaData.nombre}`, 'success');
        }
        
        fetchVentas();
        fetchStats();
        resetForm();
        setShowModal(false);
        alert(editingVenta ? 'Venta actualizada' : 'Venta creada');
      } else {
        alert('Error al guardar la venta');
      }
    } catch (error) {
      alert('Error de conexión');
    }
    setLoading(false);
  };

  const uploadAudioFile = async (ventaId) => {
    if (!selectedAudioFile) return;
    
    setUploadingAudio(true);
    const formData = new FormData();
    formData.append('audio_file', selectedAudioFile);

    try {
      const response = await fetch(`${API_BASE}/api/ventas/${ventaId}/upload-audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        console.log('Audio uploaded successfully');
      } else {
        console.error('Error uploading audio');
      }
    } catch (error) {
      console.error('Error uploading audio:', error);
    }
    setUploadingAudio(false);
  };

  const uploadImageFile = async (ventaId) => {
    if (!selectedImageFile) return;
    
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('imagen_file', selectedImageFile);

    try {
      const response = await fetch(`${API_BASE}/api/ventas/${ventaId}/upload-confirmacion-pago`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        console.log('Image uploaded successfully');
      } else {
        console.error('Error uploading image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
    setUploadingImage(false);
  };

  const viewConfirmacionPago = (ventaId) => {
    const imageUrl = `${API_BASE}/api/ventas/${ventaId}/view-confirmacion-pago?token=${encodeURIComponent(token)}`;
    window.open(imageUrl, '_blank');
  };

  const deleteConfirmacionPago = async (ventaId) => {
    if (!window.confirm('¿Está seguro de eliminar la imagen de confirmación de pago?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/ventas/${ventaId}/confirmacion-pago`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchVentas();
        alert('Imagen de confirmación de pago eliminada');
      } else {
        alert('Error al eliminar la imagen');
      }
    } catch (error) {
      alert('Error al eliminar la imagen');
    }
  };

  const downloadAudio = (ventaId, nombreCliente, estilo) => {
    // Método más simple posible - solo abrir URL directa
    const url = `${API_BASE}/api/ventas/${ventaId}/download-mobile?token=${token}`;
    window.location.href = url;
  };

  const deleteAudio = async (ventaId) => {
    if (!window.confirm('¿Está seguro de eliminar el archivo de audio?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/ventas/${ventaId}/audio`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchVentas();
        alert('Archivo de audio eliminado');
      } else {
        alert('Error al eliminar el archivo de audio');
      }
    } catch (error) {
      alert('Error al eliminar el archivo');
    }
  };

  const handleDeleteVenta = async (id) => {
    if (!confirm('¿Eliminar esta venta?')) return;

    const response = await fetch(`${API_BASE}/api/ventas/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      fetchVentas();
      fetchStats();
      alert('Venta eliminada');
    } else {
      alert('Error al eliminar');
    }
  };

  const handleEditVenta = (venta) => {
    setEditingVenta(venta);
    setVentaForm(venta);
    setShowModal(true);
  };

  const resetForm = () => {
    setVentaForm({
      fecha: new Date().toISOString().split('T')[0],
      nombre: '',
      celular: '',
      paquete: '',
      estilo: '',
      valor: '',
      estado: 'Pagada y en producción',
      texto_cancion: '',
      observacion: '',
      link_descarga: '',
      audio_filename: '',
      confirmacion_pago_imagen: ''
    });
    setEditingVenta(null);
    setSelectedAudioFile(null);
    setSelectedImageFile(null);
  };

  const filteredVentas = ventas.filter(venta => {
    const matchesSearch = venta.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         venta.celular.includes(searchTerm) ||
                         venta.estilo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = !filterEstado || venta.estado === filterEstado;
    const matchesEstilo = !filterEstilo || venta.estilo === filterEstilo;
    
    return matchesSearch && matchesEstado && matchesEstilo;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only 5 notifications
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const loadClientesAntiguos = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/clientes-antiguos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setClientesAntiguos(data);
      }
    } catch (error) {
      console.error('Error loading clientes antiguos:', error);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen dashboard-bg flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-1/4 left-1/3 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl animate-float" style={{animationDelay: '4s'}}></div>
        </div>

        <div className="relative z-10 bg-gray-900/80 backdrop-filter backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-96 max-w-md border border-cyan-500/30 neon-border login-card">
          <div className="text-center mb-8">
            <div className="mb-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2 text-glow">
                🎵 Ventas Music DT
              </h1>
              <div className="flex justify-center space-x-1 mt-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse shadow-lg shadow-purple-400/50" style={{animationDelay: '0.5s'}}></div>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse shadow-lg shadow-pink-400/50" style={{animationDelay: '1s'}}></div>
              </div>
            </div>
            <p className="text-gray-300 text-sm">Sistema de Gestión de Ventas Musicales</p>
            <p className="text-cyan-400 text-xs mt-1 glow-text-cyan">Inicia sesión para continuar</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <label className="block text-sm font-medium text-cyan-300 mb-2 glow-text-cyan">
                👤 Usuario
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                  className="neon-input w-full px-4 py-3 rounded-lg transition-all duration-300 focus:scale-105"
                  placeholder="Ingrese su usuario"
                  required
                />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100"></div>
              </div>
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-purple-300 mb-2 glow-text-purple">
                🔒 Contraseña
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  className="neon-input w-full px-4 py-3 rounded-lg transition-all duration-300 focus:scale-105"
                  placeholder="Ingrese su contraseña"
                  required
                />
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100"></div>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full neon-button py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <span className="relative z-10">
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="neon-spinner w-5 h-5"></div>
                    <span>Ingresando...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>🚀</span>
                    <span>Ingresar al Sistema</span>
                  </div>
                )}
              </span>
            </button>
          </form>

          {/* Footer with animated elements */}
          <div className="mt-8 text-center">
            <div className="flex justify-center space-x-4 text-gray-500 text-xs">
              <span className="flex items-center space-x-1">
                <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse"></div>
                <span>Seguro</span>
              </span>
              <span className="flex items-center space-x-1">
                <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                <span>Rápido</span>
              </span>
              <span className="flex items-center space-x-1">
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
                <span>Moderno</span>
              </span>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute -top-2 -left-2 w-4 h-4 border-l-2 border-t-2 border-cyan-400 rounded-tl-lg opacity-50"></div>
          <div className="absolute -top-2 -right-2 w-4 h-4 border-r-2 border-t-2 border-purple-400 rounded-tr-lg opacity-50"></div>
          <div className="absolute -bottom-2 -left-2 w-4 h-4 border-l-2 border-b-2 border-pink-400 rounded-bl-lg opacity-50"></div>
          <div className="absolute -bottom-2 -right-2 w-4 h-4 border-r-2 border-b-2 border-cyan-400 rounded-br-lg opacity-50"></div>
        </div>

        {/* Additional background effects */}
        <div className="absolute bottom-10 left-10 text-gray-700/30 text-6xl animate-float">🎵</div>
        <div className="absolute top-10 right-10 text-gray-700/30 text-4xl animate-float" style={{animationDelay: '3s'}}>🎼</div>
        <div className="absolute top-1/2 left-10 text-gray-700/30 text-5xl animate-float" style={{animationDelay: '1.5s'}}>🎤</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dashboard-bg">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 text-white shadow-2xl border-b border-cyan-500/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-glow">🎵 Ventas Music DT</h1>
              <p className="text-cyan-200">Sistema de Gestión de Ventas</p>
            </div>
            <button
              onClick={handleLogout}
              className="neon-button"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-900/80 backdrop-filter backdrop-blur-lg shadow-sm border-b border-cyan-500/20">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-all duration-300 ${
                activeTab === 'dashboard' 
                  ? 'border-cyan-400 text-cyan-400 glow-text-cyan' 
                  : 'border-transparent text-gray-400 hover:text-cyan-300'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('ventas')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-all duration-300 ${
                activeTab === 'ventas' 
                  ? 'border-purple-400 text-purple-400 glow-text-purple' 
                  : 'border-transparent text-gray-400 hover:text-purple-300'
              }`}
            >
              💰 Ventas
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        
        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="fixed top-20 right-4 z-50 space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-card p-4 rounded-xl shadow-2xl border max-w-sm animate-slide-in ${
                  notification.type === 'success' ? 'bg-gradient-to-r from-green-900 to-emerald-900 border-green-500' :
                  notification.type === 'delivery' ? 'bg-gradient-to-r from-purple-900 to-pink-900 border-purple-500' :
                  'bg-gradient-to-r from-blue-900 to-cyan-900 border-cyan-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">
                      {notification.message}
                    </p>
                    <p className="text-gray-300 text-xs mt-1">
                      {notification.timestamp.toLocaleTimeString('es-CO')}
                    </p>
                  </div>
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="text-gray-400 hover:text-white ml-3"
                  >
                    ×
                  </button>
                </div>
                <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${
                  notification.type === 'success' ? 'from-green-400 to-emerald-400' :
                  notification.type === 'delivery' ? 'from-purple-400 to-pink-400' :
                  'from-blue-400 to-cyan-400'
                } notification-progress`}></div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
                🎵 Dashboard Music DT
              </h2>
              <p className="text-gray-600">Panel de control con estadísticas en tiempo real</p>
            </div>
            
            {/* Neon Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="relative bg-gray-900 rounded-2xl p-6 border border-cyan-500/30 shadow-2xl overflow-hidden group hover:border-cyan-400 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-cyan-400 text-3xl">📈</div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50"></div>
                  </div>
                  <p className="text-cyan-300 text-sm font-medium">Total Ventas</p>
                  <p className="text-white text-3xl font-bold mt-1 glow-text-cyan">{stats.total_ventas || 0}</p>
                </div>
                <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-xl"></div>
              </div>
              
              <div className="relative bg-gray-900 rounded-2xl p-6 border border-green-500/30 shadow-2xl overflow-hidden group hover:border-green-400 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-green-400 text-3xl">💵</div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                  </div>
                  <p className="text-green-300 text-sm font-medium">Total Ingresos</p>
                  <p className="text-white text-2xl font-bold mt-1 glow-text-green">{formatCurrency(stats.total_ingresos || 0)}</p>
                </div>
                <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full blur-xl"></div>
              </div>
              
              <div className="relative bg-gray-900 rounded-2xl p-6 border border-purple-500/30 shadow-2xl overflow-hidden group hover:border-purple-400 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-purple-400 text-3xl">🎵</div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse shadow-lg shadow-purple-400/50"></div>
                  </div>
                  <p className="text-purple-300 text-sm font-medium">Estilos Musicales</p>
                  <p className="text-white text-3xl font-bold mt-1 glow-text-purple">{stats.ventas_por_estilo?.length || 0}</p>
                </div>
                <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-xl"></div>
              </div>
              
              <div className="relative bg-gray-900 rounded-2xl p-6 border border-orange-500/30 shadow-2xl overflow-hidden group hover:border-orange-400 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-orange-400 text-3xl">📋</div>
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse shadow-lg shadow-orange-400/50"></div>
                  </div>
                  <p className="text-orange-300 text-sm font-medium">Estados</p>
                  <p className="text-white text-3xl font-bold mt-1 glow-text-orange">{stats.ventas_por_estado?.length || 0}</p>
                </div>
                <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full blur-xl"></div>
              </div>
            </div>

            {/* Ingresos por Día - Gráfico Neón */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-cyan-500/30 shadow-2xl mb-8">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="mr-3">📊</span>
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Ingresos por Día
                </span>
              </h3>
              
              <div className="relative h-64 overflow-x-auto">
                <div className="flex items-end justify-center space-x-3 h-full min-w-max px-4">
                  {stats.ingresos_por_dia?.map((dia, index) => {
                    const maxIngreso = Math.max(...(stats.ingresos_por_dia?.map(d => d.ingresos) || [1]));
                    const height = (dia.ingresos / maxIngreso) * 200;
                    const colors = [
                      'from-cyan-500 to-blue-500',
                      'from-purple-500 to-pink-500', 
                      'from-green-500 to-emerald-500',
                      'from-orange-500 to-red-500',
                      'from-yellow-500 to-amber-500'
                    ];
                    const colorClass = colors[index % colors.length];
                    
                    return (
                      <div key={index} className="flex flex-col items-center group">
                        <div className="relative mb-2">
                          <div 
                            className={`w-12 bg-gradient-to-t ${colorClass} rounded-t-lg shadow-lg transition-all duration-300 group-hover:shadow-2xl group-hover:scale-105`}
                            style={{ height: `${Math.max(height, 10)}px` }}
                          >
                            {/* Efecto neón */}
                            <div className={`absolute inset-0 bg-gradient-to-t ${colorClass} rounded-t-lg opacity-50 blur-sm`}></div>
                          </div>
                          
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="bg-black/80 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap border border-cyan-500/30">
                              <div className="font-semibold text-cyan-300">{formatCurrency(dia.ingresos)}</div>
                              <div className="text-gray-300">{dia.cantidad} ventas</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-400 text-center transform rotate-45 w-16">
                          {new Date(dia._id).toLocaleDateString('es-CO', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

              {/* Top Clientes por Teléfono */}
              <div className="bg-gray-900 rounded-2xl p-6 border border-orange-500/30 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <span className="mr-3">📱</span>
                  <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                    Top por Teléfono
                  </span>
                </h3>
                <div className="space-y-3">
                  {stats.top_clientes_telefono?.map((cliente, index) => (
                    <div key={index} className="flex justify-between items-center p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 shadow-lg">
                      <div>
                        <div className="text-white font-medium">{cliente._id}</div>
                        <div className="text-orange-300 text-sm">{cliente.nombre} - {cliente.cantidad_pedidos} pedidos</div>
                      </div>
                      <div className="text-orange-400 font-bold">
                        {formatCurrency(cliente.total_gastado)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Ventas por Estado */}
              <div className="bg-gray-900 rounded-2xl p-6 border border-purple-500/30 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <span className="mr-3">📋</span>
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Ventas por Estado
                  </span>
                </h3>
                <div className="space-y-4">
                  {stats.ventas_por_estado?.map((item, index) => {
                    const colors = ['border-green-500 bg-green-500/10', 'border-yellow-500 bg-yellow-500/10', 'border-red-500 bg-red-500/10', 'border-purple-500 bg-purple-500/10'];
                    const glowColors = ['shadow-green-500/20', 'shadow-yellow-500/20', 'shadow-red-500/20', 'shadow-purple-500/20'];
                    
                    return (
                      <div key={index} className={`flex justify-between items-center p-3 rounded-lg border ${colors[index % colors.length]} ${glowColors[index % glowColors.length]} shadow-lg`}>
                        <span className="text-gray-300 font-medium">{item._id}</span>
                        <span className="text-white font-bold text-lg">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Top Clientes por Nombre */}
              <div className="bg-gray-900 rounded-2xl p-6 border border-green-500/30 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <span className="mr-3">👑</span>
                  <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    Top Clientes por Nombre
                  </span>
                </h3>
                <div className="space-y-3">
                  {stats.top_clientes?.map((cliente, index) => (
                    <div key={index} className="flex justify-between items-center p-3 rounded-lg border border-green-500/20 bg-green-500/5 shadow-lg">
                      <div>
                        <div className="text-white font-medium">{cliente._id}</div>
                        <div className="text-green-300 text-sm">{cliente.celular} - {cliente.cantidad_pedidos} pedidos</div>
                      </div>
                      <div className="text-green-400 font-bold">
                        {formatCurrency(cliente.total_gastado)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Estilos Musicales */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-cyan-500/30 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="mr-3">🎶</span>
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Estilos Musicales Más Populares
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.ventas_por_estilo?.slice(0, 9).map((item, index) => {
                  const colors = [
                    'border-cyan-500 bg-cyan-500/10',
                    'border-purple-500 bg-purple-500/10',
                    'border-pink-500 bg-pink-500/10',
                    'border-green-500 bg-green-500/10',
                    'border-yellow-500 bg-yellow-500/10',
                    'border-red-500 bg-red-500/10',
                    'border-indigo-500 bg-indigo-500/10',
                    'border-orange-500 bg-orange-500/10',
                    'border-teal-500 bg-teal-500/10'
                  ];
                  
                  return (
                    <div key={index} className={`p-4 rounded-lg border ${colors[index]} shadow-lg hover:scale-105 transition-transform duration-200`}>
                      <div className="text-white font-medium text-sm truncate mb-1">{item._id}</div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs">{item.count} ventas</span>
                        <span className="text-white font-bold text-sm">{formatCurrency(item.total_valor)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ventas' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Gestión de Ventas</h2>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                ➕ Nueva Venta
              </button>
            </div>

            {/* Filters and Sorting */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <input
                  type="text"
                  placeholder="Buscar por nombre, teléfono o estilo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Todos los estados</option>
                  <option value="entregada">Entregada</option>
                  <option value="Pagada y en producción">Pagada y en producción</option>
                  <option value="Entregado por Diegoto">Entregado por Diegoto</option>
                </select>
                
                <input
                  type="text"
                  placeholder="Filtrar por estilo..."
                  value={filterEstilo}
                  onChange={(e) => setFilterEstilo(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="fecha">Ordenar por Fecha</option>
                  <option value="nombre">Ordenar por Nombre</option>
                  <option value="valor">Ordenar por Valor</option>
                </select>

                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="desc">Más Recientes Primero</option>
                  <option value="asc">Más Antiguos Primero</option>
                </select>
              </div>
            </div>

            {/* Ventas Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estilo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Audio</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confirmación Pago</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredVentas.map((venta) => (
                      <tr key={venta.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(venta.fecha)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{venta.nombre}</div>
                          <div className="text-sm text-gray-500">{venta.celular}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {venta.estilo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(venta.valor)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            venta.estado === 'entregada' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {venta.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {venta.audio_filename ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => downloadAudio(venta.id, venta.nombre, venta.estilo)}
                                className="text-blue-600 hover:text-blue-900 flex items-center"
                                title="Descargar audio como MP3"
                              >
                                🎵 Descargar MP3
                              </button>
                              <button
                                onClick={() => deleteAudio(venta.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Eliminar audio"
                              >
                                🗑️
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin audio</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {venta.confirmacion_pago_imagen ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => viewConfirmacionPago(venta.id)}
                                className="text-green-600 hover:text-green-900 flex items-center"
                                title="Ver imagen de confirmación de pago"
                              >
                                🖼️ Ver Imagen
                              </button>
                              <button
                                onClick={() => deleteConfirmacionPago(venta.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Eliminar imagen"
                              >
                                🗑️
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin imagen</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEditVenta(venta)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDeleteVenta(venta.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            🗑️ Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  {editingVenta ? 'Editar Venta' : 'Nueva Venta'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleVentaSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={ventaForm.fecha}
                      onChange={(e) => setVentaForm({...ventaForm, fecha: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Cliente
                    </label>
                    <input
                      type="text"
                      value={ventaForm.nombre}
                      onChange={(e) => setVentaForm({...ventaForm, nombre: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Celular
                    </label>
                    <input
                      type="text"
                      value={ventaForm.celular}
                      onChange={(e) => setVentaForm({...ventaForm, celular: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estilo Musical
                    </label>
                    <input
                      type="text"
                      value={ventaForm.estilo}
                      onChange={(e) => setVentaForm({...ventaForm, estilo: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Ej: Ranchera, Vallenato, Popular"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor
                    </label>
                    <input
                      type="number"
                      value={ventaForm.valor}
                      onChange={(e) => setVentaForm({...ventaForm, valor: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="15000"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <select
                      value={ventaForm.estado}
                      onChange={(e) => setVentaForm({...ventaForm, estado: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Pagada y en producción">Pagada y en producción</option>
                      <option value="entregada">Entregada</option>
                      <option value="Entregado por Diegoto">Entregado por Diegoto</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paquete
                  </label>
                  <input
                    type="text"
                    value={ventaForm.paquete}
                    onChange={(e) => setVentaForm({...ventaForm, paquete: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej: Canción con tu letra o idea"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Texto de la Canción
                  </label>
                  <textarea
                    value={ventaForm.texto_cancion}
                    onChange={(e) => setVentaForm({...ventaForm, texto_cancion: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    rows={6}
                    placeholder="Letra completa de la canción..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Observación
                    </label>
                    <input
                      type="text"
                      value={ventaForm.observacion}
                      onChange={(e) => setVentaForm({...ventaForm, observacion: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link de Descarga
                    </label>
                    <input
                      type="url"
                      value={ventaForm.link_descarga}
                      onChange={(e) => setVentaForm({...ventaForm, link_descarga: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Archivo de Audio
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac"
                      onChange={(e) => setSelectedAudioFile(e.target.files[0])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    {selectedAudioFile && (
                      <span className="text-sm text-green-600">
                        ✓ {selectedAudioFile.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Formatos soportados: MP3, WAV, M4A, OGG, FLAC, AAC
                  </p>
                  {editingVenta && editingVenta.audio_filename && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        📁 Archivo actual: {editingVenta.audio_filename}
                      </p>
                      <button
                        type="button"
                        onClick={() => downloadAudio(editingVenta.id, editingVenta.nombre, editingVenta.estilo)}
                        className="text-blue-600 hover:text-blue-800 text-sm mt-1"
                      >
                        🎵 Descargar archivo actual como MP3
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Imagen de Confirmación de Pago
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.gif,.bmp,.webp"
                      onChange={(e) => setSelectedImageFile(e.target.files[0])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    {selectedImageFile && (
                      <span className="text-sm text-green-600">
                        ✓ {selectedImageFile.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Formatos soportados: JPG, PNG, GIF, BMP, WEBP
                  </p>
                  {editingVenta && editingVenta.confirmacion_pago_imagen && (
                    <div className="mt-2 p-2 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-700">
                        🖼️ Imagen actual: {editingVenta.confirmacion_pago_imagen}
                      </p>
                      <button
                        type="button"
                        onClick={() => viewConfirmacionPago(editingVenta.id)}
                        className="text-green-600 hover:text-green-800 text-sm mt-1"
                      >
                        👁️ Ver imagen actual
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || uploadingAudio || uploadingImage}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
                  >
                    {loading || uploadingAudio || uploadingImage ? (
                      uploadingAudio ? 'Subiendo audio...' : 
                      uploadingImage ? 'Subiendo imagen...' : 'Guardando...'
                    ) : (
                      editingVenta ? 'Actualizar' : 'Crear'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;