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
    detection: null
  });
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const wsRef = useRef(null);

  // Conectar al WebSocket
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket('ws://localhost:8765');
      
      ws.onopen = () => {
        console.log('Conectado al servidor OpenMV');
        setIsConnected(true);
        setConnectionStatus('connected');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'tank_data') {
          setTankData(data.data);
        } else if (data.type === 'status') {
          console.log('Status:', data.message);
        }
      };

      ws.onerror = (error) => {
        console.error('Error WebSocket:', error);
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        console.log('Desconectado del servidor OpenMV');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Reconectar después de 3 segundos
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error al conectar:', error);
      setConnectionStatus('error');
    }
  };

  const sendCommand = (command) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command }));
    }
  };

  const handleStartMonitoring = () => {
    sendCommand('start');
    setIsMonitoring(true);
  };

  const handleStopMonitoring = () => {
    sendCommand('stop');
    setIsMonitoring(false);
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
    if (percentage >= 75) return 'text-red-600';
    if (percentage >= 50) return 'text-yellow-600';
    if (percentage >= 25) return 'text-blue-600';
    return 'text-green-600';
  };

  const getTankFillHeight = (percentage) => {
    return `${percentage}%`;
  };

  return (
    <div className="w-full min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header con controles */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-extrabold text-[#0f3d28]">
                Monitoreo OpenMV Cam RT1062
              </h1>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}></div>
                <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleStartMonitoring}
                disabled={!isConnected || isMonitoring}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition duration-300 flex items-center gap-2"
              >
                <i className="fas fa-play"></i>
                Iniciar
              </button>
              <button
                onClick={handleStopMonitoring}
                disabled={!isConnected || !isMonitoring}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition duration-300 flex items-center gap-2"
              >
                <i className="fas fa-stop"></i>
                Detener
              </button>
            </div>
          </div>
        </div>

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
                  <div className="absolute top-0 left-0 right-0 h-full flex flex-col justify-between py-2">
                    {[100, 75, 50, 25, 0].map((level) => (
                      <div key={level} className="flex items-center justify-between px-2">
                        <div className="w-4 h-0.5 bg-gray-600"></div>
                        <span className="text-xs font-bold text-gray-700">{level}%</span>
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
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Etiqueta:</span>
                    <span className="font-semibold text-[#0f3d28]">{tankData.label}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">FPS:</span>
                    <span className="font-semibold text-[#0f3d28]">{tankData.fps?.toFixed(1) || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de datos y gráficas */}
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
                  <i className="fas fa-search text-4xl mb-3"></i>
                  <p>No hay detecciones activas</p>
                </div>
              )}
            </div>

            {/* Historial de niveles */}
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
                    {isMonitoring ? 'Activo' : 'Inactivo'}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <i className="fas fa-microchip text-2xl text-[#1ea34a]"></i>
                    <div>
                      <p className="font-semibold text-gray-800">Modelo de IA</p>
                      <p className="text-sm text-gray-600">Detección de nivel por visión térmica</p>
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
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <i className="fas fa-info-circle text-blue-500 text-xl mt-1"></i>
            <div>
              <h3 className="font-bold text-blue-900 mb-2">Instrucciones de uso:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>1. Asegúrate de que la OpenMV Cam esté conectada al puerto USB</li>
                <li>2. Verifica que el servidor backend esté ejecutándose (python openmv_server.py)</li>
                <li>3. Haz clic en "Iniciar" para comenzar el monitoreo en tiempo real</li>
                <li>4. Los datos se actualizarán automáticamente conforme se detecten niveles</li>
                <li>5. Usa "Detener" cuando termines el monitoreo</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}