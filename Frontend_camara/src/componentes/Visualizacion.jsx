import { useState, useEffect, useRef } from 'react';

export default function Visualizacion() {
  const [isConnected, setIsConnected] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [tankData, setTankData] = useState({
    percentage: 0,
    label: 'Desconocido',
    timestamp: null
  });
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [alerts, setAlerts] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const monitoringStartTime = useRef(null);

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
      const ws = new WebSocket('ws://localhost:8765');
      
      ws.onopen = () => {
        console.log('✓ Conectado al servidor OpenMV');
        setIsConnected(true);
        setConnectionStatus('connected');
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
              handleTankData(data.data);
              break;
              
            case 'alert':
              // Solo agregar alertas críticas y de advertencia
              if (data.data.level !== 'info') {
                addAlert(data.data);
              }
              break;
              
            case 'status':
              setIsMonitoring(data.is_monitoring);
              if (data.data) {
                handleTankData(data.data);
              }
              break;
              
            case 'response':
              console.log(`Respuesta ${data.command}:`, data.message);
              if (data.command === 'start') {
                setIsMonitoring(data.success);
                if (data.success) {
                  monitoringStartTime.current = Date.now();
                  setHistoricalData([]); // Limpiar historial al iniciar
                }
              }
              break;
              
            default:
              console.log('Mensaje no reconocido:', data);
          }
        } catch (error) {
          console.error('Error procesando mensaje:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Error WebSocket:', error);
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        console.log('✗ Desconectado del servidor OpenMV');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setIsMonitoring(false);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error al conectar:', error);
      setConnectionStatus('error');
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
    }
  };

  const handleTankData = (data) => {
    // Extraer porcentaje del label si tiene formato "Tanque_XX"
    let percentage = data.percentage;
    if (data.label && data.label.includes('_')) {
      const parts = data.label.split('_');
      if (parts.length > 1) {
        const extractedPercentage = parseInt(parts[1]);
        if (!isNaN(extractedPercentage)) {
          percentage = extractedPercentage;
        }
      }
    }

    const newData = {
      percentage: percentage,
      label: data.label,
      timestamp: data.timestamp || new Date().toISOString()
    };

    setTankData(newData);

    // Agregar al histórico si está monitoreando
    if (isMonitoring && monitoringStartTime.current) {
      const elapsedSeconds = Math.floor((Date.now() - monitoringStartTime.current) / 1000);
      
      setHistoricalData(prev => {
        // Evitar duplicados muy cercanos (menos de 1 segundo)
        if (prev.length > 0) {
          const lastEntry = prev[prev.length - 1];
          if (elapsedSeconds - lastEntry.time < 1) {
            return prev;
          }
        }
        
        // Limitar a 100 puntos para mantener el rendimiento
        const newHistory = [...prev, { 
          time: elapsedSeconds, 
          percentage: percentage 
        }];
        
        return newHistory.length > 100 
          ? newHistory.slice(newHistory.length - 100) 
          : newHistory;
      });
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
      console.log('Iniciando monitoreo...');
      monitoringStartTime.current = Date.now();
      setHistoricalData([]);
    }
  };

  const handleStopMonitoring = () => {
    if (sendCommand('stop')) {
      console.log('Deteniendo monitoreo...');
      setIsMonitoring(false);
    }
  };

  const addAlert = (alert) => {
    setAlerts(prev => {
      const exists = prev.some(a => 
        a.message === alert.message && 
        Math.abs(new Date(a.timestamp) - new Date(alert.timestamp)) < 5000
      );
      
      if (exists) return prev;
      
      const newAlerts = [alert, ...prev].slice(0, 10);
      return newAlerts;
    });
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
      default: return 'fa-bell';
    }
  };

  const getAlertColor = (level) => {
    switch(level) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-900';
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      default: return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generar el gráfico SVG
  const renderChart = () => {
    if (historicalData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-gray-400">
          <div className="text-center">
            <i className="fas fa-chart-line text-6xl mb-4 opacity-30"></i>
            <p className="font-medium">Sin datos históricos</p>
            <p className="text-sm mt-2">Inicia el monitoreo para ver el gráfico</p>
          </div>
        </div>
      );
    }

    const width = 100; // Porcentaje
    const height = 300; // Píxeles
    const padding = { top: 20, right: 40, bottom: 40, left: 50 };
    
    const maxTime = Math.max(...historicalData.map(d => d.time), 60);
    const xScale = (time) => (time / maxTime) * (width - (padding.left + padding.right) / 4);
    const yScale = (percentage) => height - padding.bottom - ((percentage / 100) * (height - padding.top - padding.bottom));

    // Crear la línea del gráfico
    const pathData = historicalData
      .map((d, i) => {
        const x = xScale(d.time);
        const y = yScale(d.percentage);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    // Marcas del eje Y (niveles)
    const yTicks = [0, 25, 50, 75, 100];
    
    // Marcas del eje X (tiempo) - cada 30 segundos o ajustado según datos
    const timeInterval = maxTime > 300 ? 60 : 30;
    const xTicks = [];
    for (let t = 0; t <= maxTime; t += timeInterval) {
      xTicks.push(t);
    }

    return (
      <div className="relative w-full h-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Líneas de la cuadrícula */}
          {yTicks.map(tick => (
            <g key={`y-${tick}`}>
              <line
                x1={padding.left / 4}
                y1={yScale(tick)}
                x2={width - padding.right / 4}
                y2={yScale(tick)}
                stroke="#e5e7eb"
                strokeWidth="0.3"
              />
              <text
                x={(padding.left / 4) - 2}
                y={yScale(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="3"
                fill="#6b7280"
              >
                {tick}%
              </text>
            </g>
          ))}

          {/* Marcas del eje X */}
          {xTicks.map(tick => (
            <g key={`x-${tick}`}>
              <line
                x1={xScale(tick)}
                y1={height - padding.bottom}
                x2={xScale(tick)}
                y2={height - padding.bottom + 2}
                stroke="#6b7280"
                strokeWidth="0.3"
              />
              <text
                x={xScale(tick)}
                y={height - padding.bottom + 6}
                textAnchor="middle"
                fontSize="3"
                fill="#6b7280"
              >
                {formatTime(tick)}
              </text>
            </g>
          ))}

          {/* Línea del gráfico */}
          <path
            d={pathData}
            fill="none"
            stroke="#2B7FFF"
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Puntos en el gráfico */}
          {historicalData.map((d, i) => (
            <circle
              key={i}
              cx={xScale(d.time)}
              cy={yScale(d.percentage)}
              r="1"
              fill="#1ea34a"
            />
          ))}

          {/* Etiquetas de los ejes */}
          <text
            x={width / 2}
            y={height - 5}
            textAnchor="middle"
            fontSize="4"
            fill="#374151"
            fontWeight="bold"
          >
            Tiempo (min:seg)
          </text>
          
          <text
            x="5"
            y={height / 2}
            textAnchor="middle"
            fontSize="4"
            fill="#374151"
            fontWeight="bold"
            transform={`rotate(-90, 5, ${height / 2})`}
          >
            Nivel (%)
          </text>
        </svg>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header con controles */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-extrabold text-[#0f3d28]">
                Monitoreo de Nivel de Tanque
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

        {/* Alertas (solo críticas y advertencias) */}
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

        {/* Visualización del tanque y estado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Tanque */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-[#0f3d28] mb-6 text-center">
              Estado del Tanque
            </h2>
            
            {/* Tanque visual más grande */}
            <div className="relative w-full max-w-md mx-auto">
              <div className="w-full h-[500px] border-4 border-gray-800 rounded-lg overflow-hidden bg-gray-200 relative">
                {/* Nivel de líquido */}
                <div 
                  className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500"
                  style={{ height: getTankFillHeight(tankData.percentage) }}
                >
                  <div className="absolute top-0 left-0 right-0 h-12 bg-blue-300 opacity-50 animate-pulse"></div>
                </div>
                
                {/* Marcadores de nivel */}
                <div className="absolute top-0 left-0 right-0 h-full flex flex-col justify-between py-4 pointer-events-none">
                  {[100, 75, 50, 25, 0].map((level) => (
                    <div key={level} className="flex items-center justify-between px-4">
                      <div className="w-6 h-0.5 bg-gray-600"></div>
                      <span className="text-base font-bold text-gray-700 bg-white px-2 rounded">{level}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Información del nivel */}
            <div className="mt-8 space-y-4">
              <div className="text-center">
                <p className="text-lg text-gray-600 mb-2">Nivel Actual</p>
                <p className={`text-7xl font-bold ${getLevelColor(tankData.percentage)}`}>
                  {tankData.percentage}%
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                <div className="flex justify-between items-center text-lg">
                  <span className="text-gray-600">Etiqueta Detectada:</span>
                  <span className="font-semibold text-[#0f3d28]">{tankData.label}</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span className="text-gray-600">Estado del Monitoreo:</span>
                  <span className={`font-semibold ${isMonitoring ? 'text-green-600' : 'text-gray-600'}`}>
                    {isMonitoring ? '🟢 Activo' : '⚪ Inactivo'}
                  </span>
                </div>
                {tankData.timestamp && (
                  <div className="flex justify-between items-center text-sm pt-3 border-t border-gray-200">
                    <span className="text-gray-600">Última actualización:</span>
                    <span className="font-medium text-gray-800">
                      {new Date(tankData.timestamp).toLocaleTimeString('es-CO')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gráfico histórico */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-[#0f3d28] mb-4">
              Histórico de Nivel
            </h2>
            <div className="h-[600px]">
              {renderChart()}
            </div>
            {historicalData.length > 0 && (
              <div className="mt-4 flex justify-between text-sm text-gray-600">
                <span>
                  <i className="fas fa-clock mr-1"></i>
                  Puntos de datos: {historicalData.length}
                </span>
                <span>
                  <i className="fas fa-hourglass-half mr-1"></i>
                  Duración: {formatTime(historicalData[historicalData.length - 1]?.time || 0)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Instrucciones */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <i className="fas fa-info-circle text-blue-500 text-xl mt-1"></i>
            <div>
              <h3 className="font-bold text-blue-900 mb-2">Instrucciones de uso:</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Conecta la cámara al puerto USB</li>
                <li>Ejecuta <code className="bg-blue-100 px-2 py-0.5 rounded">python openmv_server.py</code> en el backend</li>
                <li>Ejecuta el script de detección desde Visual Studio Code, hacer click en "connect"-"Run" y proceder a "disconnet"</li>
                <li>Haz clic en "Iniciar" para comenzar el monitoreo</li>
                <li>El gráfico mostrará el histórico de niveles desde que iniciaste el monitoreo</li>
              </ol>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}