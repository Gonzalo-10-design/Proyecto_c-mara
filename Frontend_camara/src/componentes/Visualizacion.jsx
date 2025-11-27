// Frontend_camara/src/componentes/Visualizacion.jsx
import { useState, useEffect, useRef } from 'react';

export default function Visualizacion() {
  const [isConnected, setIsConnected] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [tankData, setTankData] = useState({
    level: 0,
    percentage: 0,
    label: 'Desconocido',
    fps: 0,
    detection: null,
    timestamp: null
  });
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Conectar al WebSocket
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      // Cambiar a la IP de tu servidor si es necesario
      const ws = new WebSocket('ws://localhost:8765');
      
      ws.onopen = () => {
        console.log('✓ Conectado al servidor OpenMV');
        setIsConnected(true);
        setConnectionStatus('connected');
        
        // Solicitar estado actual
        ws.send(JSON.stringify({ command: 'get_status' }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch(data.type) {
            case 'connection':
              console.log('Mensaje de conexión:', data.message);
              break;
              
            case 'tank_data':
              setTankData(data.data);
              break;
              
            case 'alert':
              addAlert(data.data);
              break;
              
            case 'status':
              setIsMonitoring(data.is_monitoring);
              if (data.data) {
                setTankData(data.data);
              }
              break;
              
            case 'response':
              console.log(`Respuesta ${data.command}:`, data.message);
              if (data.command === 'start') {
                setIsMonitoring(data.success);
              }
              break;
              
            case 'history':
              setHistory(data.data);
              break;
              
            default:
              console.log('Mensaje no reconocido:', data);
          }
        } catch (error) {
          console.error('Error procesando mensaje:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Error WebSocket:', error);
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        console.log('✗ Desconectado del servidor OpenMV');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setIsMonitoring(false);
        
        // Reconectar después de 3 segundos
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('❌ Error al conectar:', error);
      setConnectionStatus('error');
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
    }
  };

  const sendCommand = (command) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command }));
      return true;
    }
    console.error('WebSocket no está conectado');
    return false;
  };

  const handleStartMonitoring = () => {
    if (sendCommand('start')) {
      console.log('📡 Iniciando monitoreo...');
    }
  };

  const handleStopMonitoring = () => {
    if (sendCommand('stop')) {
      console.log('⏸️ Deteniendo monitoreo...');
      setIsMonitoring(false);
    }
  };

  const addAlert = (alert) => {
    setAlerts(prev => {
      // Evitar duplicados
      const exists = prev.some(a => 
        a.message === alert.message && 
        Math.abs(new Date(a.timestamp) - new Date(alert.timestamp)) < 5000
      );
      
      if (exists) return prev;
      
      // Mantener solo las últimas 10 alertas
      const newAlerts = [alert, ...prev].slice(0, 10);
      return newAlerts;
    });

    // Auto-eliminar alerta después de 10 segundos para alertas informativas
    if (alert.level === 'info') {
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a !== alert));
      }, 10000);
    }
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-red-500';
      case 'error': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Conectado';
      case 'disconnected': return 'Desconectado';
      case 'error': return 'Error';
      default: return 'Desconocido';
    }
  };

  const getLevelColor = (percentage) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-orange-600';
    if (percentage >= 50) return 'text-yellow-600';
    if (percentage >= 25) return 'text-blue-600';
    return 'text-green-600';
  };

  const getTankFillHeight = (percentage) => {
    return `${Math.min(percentage, 100)}%`;
  };

  const getAlertIcon = (level) => {
    switch(level) {
      case 'critical': return 'fa-exclamation-circle';
      case 'warning': return 'fa-exclamation-triangle';
      case 'info': return 'fa-info-circle';
      default: return 'fa-bell';
    }
  };

  const getAlertColor = (level) => {
    switch(level) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-900';
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      case 'info': return 'bg-blue-100 border-blue-500 text-blue-900';
      default: return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header con controles */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-extrabold text-[#0f3d28]">
                Monitoreo OpenMV Cam RT1062
              </h1>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${isConnected ? 'animate-pulse' : ''}`}></div>
                <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleStartMonitoring}
                disabled={!isConnected || isMonitoring}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition duration-300 flex items-center gap-2 disabled:cursor-not-allowed"
              >
                <i className="fas fa-play"></i>
                {isMonitoring ? 'Monitoreando...' : 'Iniciar'}
              </button>
              <button
                onClick={handleStopMonitoring}
                disabled={!isConnected || !isMonitoring}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition duration-300 flex items-center gap-2 disabled:cursor-not-allowed"
              >
                <i className="fas fa-stop"></i>
                Detener
              </button>
            </div>
          </div>
        </div>

        {/* Alertas */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#0f3d28] flex items-center gap-2">
                <i className="fas fa-bell"></i>
                Alertas del Sistema
              </h2>
              <button
                onClick={clearAlerts}
                className="text-sm text-gray-600 hover:text-red-600 transition duration-200"
              >
                <i className="fas fa-times-circle mr-1"></i>
                Limpiar todo
              </button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-4 rounded-lg border-l-4 ${getAlertColor(alert.level)} animate-fadeIn`}
                >
                  <i className={`fas ${getAlertIcon(alert.level)} text-xl mt-1`}></i>
                  <div className="flex-1">
                    <p className="font-semibold">{alert.message}</p>
                    <p className="text-xs mt-1 opacity-75">
                      {new Date(alert.timestamp).toLocaleString('es-CO')}
                    </p>
                  </div>
                  <button
                    onClick={() => setAlerts(prev => prev.filter((_, i) => i !== index))}
                    className="text-sm opacity-50 hover:opacity-100"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Visualización del tanque */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-[#0f3d28] mb-4 text-center">
                Estado del Tanque
              </h2>
              
              {/* Tanque visual */}
              <div className="relative w-full max-w-xs mx-auto">
                <div className="w-full h-96 border-4 border-gray-800 rounded-lg overflow-hidden bg-gray-200 relative">
                  {/* Nivel de líquido */}
                  <div 
                    className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500"
                    style={{ height: getTankFillHeight(tankData.percentage) }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-8 bg-blue-300 opacity-50 animate-pulse"></div>
                  </div>
                  
                  {/* Marcadores de nivel */}
                  <div className="absolute top-0 left-0 right-0 h-full flex flex-col justify-between py-2 pointer-events-none">
                    {[100, 75, 50, 25, 0].map((level) => (
                      <div key={level} className="flex items-center justify-between px-2">
                        <div className="w-4 h-0.5 bg-gray-600"></div>
                        <span className="text-xs font-bold text-gray-700 bg-white px-1 rounded">{level}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Información del nivel */}
              <div className="mt-6 space-y-3">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Nivel Actual</p>
                  <p className={`text-5xl font-bold ${getLevelColor(tankData.percentage)}`}>
                    {tankData.percentage}%
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Etiqueta:</span>
                    <span className="font-semibold text-[#0f3d28]">{tankData.label}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">FPS:</span>
                    <span className="font-semibold text-[#0f3d28]">
                      {tankData.fps?.toFixed(1) || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Estado:</span>
                    <span className={`font-semibold ${isMonitoring ? 'text-green-600' : 'text-gray-600'}`}>
                      {isMonitoring ? '🟢 Activo' : '⚪ Inactivo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de datos */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Datos de detección */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-[#0f3d28] mb-4">
                Datos de Detección
              </h2>
              
              {tankData.detection ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600 mb-1">Coordenada X</p>
                    <p className="text-2xl font-bold text-blue-600">{tankData.detection.x}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600 mb-1">Coordenada Y</p>
                    <p className="text-2xl font-bold text-blue-600">{tankData.detection.y}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600 mb-1">Confianza</p>
                    <p className="text-2xl font-bold text-green-600">
                      {(tankData.detection.score * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <i className="fas fa-search text-4xl mb-3 opacity-30"></i>
                  <p className="font-medium">No hay detecciones activas</p>
                  <p className="text-sm mt-1">Inicia el monitoreo para ver datos en tiempo real</p>
                </div>
              )}
            </div>

            {/* Información del Sistema */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-[#0f3d28] mb-4">
                Información del Sistema
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <i className="fas fa-camera text-2xl text-[#2B7FFF]"></i>
                    <div>
                      <p className="font-semibold text-gray-800">OpenMV Cam RT1062</p>
                      <p className="text-sm text-gray-600">Flir Lepton 3.5</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${isMonitoring ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {isMonitoring ? '✓ Activo' : '○ Inactivo'}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <i className="fas fa-microchip text-2xl text-[#1ea34a]"></i>
                    <div>
                      <p className="font-semibold text-gray-800">Modelo de IA</p>
                      <p className="text-sm text-gray-600">FOMO - Detección térmica</p>
                    </div>
                  </div>
                </div>

                {tankData.timestamp && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <i className="fas fa-clock text-2xl text-yellow-600"></i>
                      <div>
                        <p className="font-semibold text-gray-800">Última actualización</p>
                        <p className="text-sm text-gray-600">
                          {new Date(tankData.timestamp).toLocaleString('es-CO')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Instrucciones */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <i className="fas fa-info-circle text-blue-500 text-xl mt-1"></i>
            <div>
              <h3 className="font-bold text-blue-900 mb-2">Instrucciones de uso:</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Conecta la OpenMV Cam RT1062 al puerto USB</li>
                <li>Ejecuta <code className="bg-blue-100 px-2 py-0.5 rounded">python openmv_server.py</code> en el backend</li>
                <li>Ejecuta el script de detección en la OpenMV desde OpenMV IDE</li>
                <li>Haz clic en "Iniciar" para comenzar el monitoreo</li>
                <li>Los datos se actualizarán automáticamente en tiempo real</li>
              </ol>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}