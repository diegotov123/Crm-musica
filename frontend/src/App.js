import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [ventas, setVentas] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [editingVenta, setEditingVenta] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterEstilo, setFilterEstilo] = useState('');

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
    audio_filename: ''
  });

  const [selectedAudioFile, setSelectedAudioFile] = useState(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  useEffect(() => {
    if (token) {
      setIsLoggedIn(true);
      fetchVentas();
      fetchStats();
    }
  }, [token]);

  const fetchVentas = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ventas`, {
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
    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.access_token);
        localStorage.setItem('token', data.access_token);
        setIsLoggedIn(true);
      } else {
        alert('Credenciales inválidas');
      }
    } catch (error) {
      alert('Error de conexión');
    }
    setLoading(false);
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

  const downloadAudio = async (ventaId, nombreCliente) => {
    try {
      const response = await fetch(`${API_BASE}/api/ventas/${ventaId}/download-audio`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${nombreCliente}_audio`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('No hay archivo de audio para descargar');
      }
    } catch (error) {
      alert('Error al descargar el audio');
    }
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
    if (!window.confirm('¿Está seguro de eliminar esta venta?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/ventas/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchVentas();
        fetchStats();
        alert('Venta eliminada');
      }
    } catch (error) {
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
      link_descarga: ''
    });
    setEditingVenta(null);
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

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-800 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-96 max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">🎵 Ventas Music DT</h1>
            <p className="text-gray-600">Sistema de Gestión de Ventas</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <input
                type="text"
                value={loginData.username}
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ingrese su usuario"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ingrese su contraseña"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">🎵 Ventas Music DT</h1>
              <p className="text-purple-100">Sistema de Gestión de Ventas</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard' 
                  ? 'border-purple-500 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('ventas')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'ventas' 
                  ? 'border-purple-500 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              💰 Ventas
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                <div className="flex items-center">
                  <div className="text-blue-500 text-2xl mr-3">📈</div>
                  <div>
                    <p className="text-sm text-gray-600">Total Ventas</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.total_ventas || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                <div className="flex items-center">
                  <div className="text-green-500 text-2xl mr-3">💵</div>
                  <div>
                    <p className="text-sm text-gray-600">Total Ingresos</p>
                    <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.total_ingresos || 0)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                <div className="flex items-center">
                  <div className="text-purple-500 text-2xl mr-3">🎵</div>
                  <div>
                    <p className="text-sm text-gray-600">Estilos Musicales</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.ventas_por_estilo?.length || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
                <div className="flex items-center">
                  <div className="text-orange-500 text-2xl mr-3">📋</div>
                  <div>
                    <p className="text-sm text-gray-600">Estados</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.ventas_por_estado?.length || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Ventas por Estado</h3>
                <div className="space-y-3">
                  {stats.ventas_por_estado?.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-600">{item._id}</span>
                      <span className="font-semibold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Ventas por Estilo Musical</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {stats.ventas_por_estilo?.slice(0, 8).map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-600 truncate">{item._id}</span>
                      <div className="text-right">
                        <div className="font-semibold">{item.count}</div>
                        <div className="text-sm text-gray-500">{formatCurrency(item.total_valor)}</div>
                      </div>
                    </div>
                  ))}
                </div>
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

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                </select>
                
                <input
                  type="text"
                  placeholder="Filtrar por estilo..."
                  value={filterEstilo}
                  onChange={(e) => setFilterEstilo(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
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
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : (editingVenta ? 'Actualizar' : 'Crear')}
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