import { useState, useEffect, useRef } from 'react';

export default function Alertas() {
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [filterLevel, setFilterLevel] = useState('all');
  const wsRef = useRef(null);

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
        console.log('Conectado al servidor de alertas');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Solo procesar alertas críticas y de advertencia
          if (data.type === 'alert' && data.data.level !== 'info') {
            addAlert(data.data);
          }
        } catch (error) {
          console.error('Error procesando mensaje:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Error WebSocket:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('Desconectado del servidor de alertas');
        setIsConnected(false);
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error al conectar:', error);
      setTimeout(connectWebSocket, 3000);
    }
  };

  const addAlert = (alert) => {
    setAlerts(prev => {
      // Evitar duplicados recientes (dentro de 5 segundos)
      const exists = prev.some(a => 
        a.message === alert.message && 
        Math.abs(new Date(a.timestamp) - new Date(alert.timestamp)) < 5000
      );
      
      if (exists) return prev;
      
      return [alert, ...prev];
    });
  };

  const clearAlert = (index) => {
    setAlerts(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
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
      case 'critical': return 'bg-red-50 border-red-500';
      case 'warning': return 'bg-yellow-50 border-yellow-500';
      default: return 'bg-gray-50 border-gray-500';
    }
  };

  const getAlertTextColor = (level) => {
    switch(level) {
      case 'critical': return 'text-red-900';
      case 'warning': return 'text-yellow-900';
      default: return 'text-gray-900';
    }
  };

  const filteredAlerts = filterLevel === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.level === filterLevel);

  const getAlertStats = () => {
    return {
      total: alerts.length,
      critical: alerts.filter(a => a.level === 'critical').length,
      warning: alerts.filter(a => a.level === 'warning').length
    };
  };

  const stats = getAlertStats();

  return (
    <div className="w-full min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-[#0f3d28] flex items-center gap-3">
                <i className="fas fa-bell"></i>
                Sistema de Alertas
              </h1>
              <p className="text-gray-600 mt-2">
                Monitoreo y notificaciones en tiempo real del nivel de tanque
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-gray-700">
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <i className="fas fa-bell text-3xl text-gray-600 mb-2"></i>
            <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
            <p className="text-sm text-gray-600">Total de Alertas</p>
          </div>
          
          <div className="bg-red-50 rounded-lg shadow-lg p-6 text-center border-2 border-red-200">
            <i className="fas fa-exclamation-circle text-3xl text-red-600 mb-2"></i>
            <p className="text-3xl font-bold text-red-800">{stats.critical}</p>
            <p className="text-sm text-red-600">Críticas</p>
          </div>
          
          <div className="bg-yellow-50 rounded-lg shadow-lg p-6 text-center border-2 border-yellow-200">
            <i className="fas fa-exclamation-triangle text-3xl text-yellow-600 mb-2"></i>
            <p className="text-3xl font-bold text-yellow-800">{stats.warning}</p>
            <p className="text-sm text-yellow-600">Advertencias</p>
          </div>
        </div>

        {/* Filtros y controles */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterLevel('all')}
                className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${
                  filterLevel === 'all' 
                    ? 'bg-[#2B7FFF] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <i className="fas fa-list mr-2"></i>
                Todas ({stats.total})
              </button>
              <button
                onClick={() => setFilterLevel('critical')}
                className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${
                  filterLevel === 'critical' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <i className="fas fa-exclamation-circle mr-2"></i>
                Críticas ({stats.critical})
              </button>
              <button
                onClick={() => setFilterLevel('warning')}
                className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${
                  filterLevel === 'warning' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <i className="fas fa-exclamation-triangle mr-2"></i>
                Advertencias ({stats.warning})
              </button>
            </div>
            
            <button
              onClick={clearAllAlerts}
              disabled={alerts.length === 0}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition duration-200 disabled:cursor-not-allowed"
            >
              <i className="fas fa-trash mr-2"></i>
              Limpiar Todo
            </button>
          </div>
        </div>

        {/* Lista de alertas */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-[#0f3d28] mb-4">
            Alertas Recientes
            {filterLevel !== 'all' && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                (Filtrando por: {filterLevel})
              </span>
            )}
          </h2>
          
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-bell-slash text-6xl text-gray-300 mb-4"></i>
              <p className="text-xl text-gray-500 font-medium">
                {alerts.length === 0 
                  ? 'No hay alertas registradas' 
                  : `No hay alertas de tipo "${filterLevel}"`}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Las alertas aparecerán aquí cuando el sistema detecte situaciones importantes
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredAlerts.map((alert, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-4 p-4 rounded-lg border-l-4 ${getAlertColor(alert.level)} transition-all duration-300 hover:shadow-md`}
                >
                  <div className={`text-2xl mt-1 ${getAlertTextColor(alert.level)}`}>
                    <i className={`fas ${getAlertIcon(alert.level)}`}></i>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className={`font-semibold text-lg ${getAlertTextColor(alert.level)}`}>
                          {alert.message}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm">
                          <span className="flex items-center gap-1">
                            <i className="fas fa-percentage"></i>
                            <strong>Nivel:</strong> {alert.percentage}%
                          </span>
                          <span className="flex items-center gap-1">
                            <i className="fas fa-clock"></i>
                            <strong>Hora:</strong> {new Date(alert.timestamp).toLocaleTimeString('es-CO')}
                          </span>
                          <span className="flex items-center gap-1">
                            <i className="fas fa-calendar"></i>
                            <strong>Fecha:</strong> {new Date(alert.timestamp).toLocaleDateString('es-CO')}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => clearAlert(index)}
                        className="ml-4 text-gray-400 hover:text-gray-600 transition duration-200"
                      >
                        <i className="fas fa-times text-xl"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Información */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <i className="fas fa-lightbulb text-blue-500 text-xl mt-1"></i>
            <div>
              <h3 className="font-bold text-blue-900 mb-2">Tipos de Alertas:</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start gap-2">
                  <i className="fas fa-exclamation-circle text-red-600 mt-1"></i>
                  <span><strong>Críticas:</strong> Tanque lleno (100%) - Requiere acción inmediata</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-exclamation-triangle text-yellow-600 mt-1"></i>
                  <span><strong>Advertencias:</strong> Nivel al 25% - Monitoreo recomendado</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}