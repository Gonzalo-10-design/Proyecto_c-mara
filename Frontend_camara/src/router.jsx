// Frontend_camara/src/router.jsx
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Inicio from './componentes/Inicio'
import Contacto from './componentes/Contacto'
import Alertas from './componentes/Alertas'
import Visualizacion from './componentes/Visualizacion'
import Login from './componentes/Login'
import Layout from './Layout/Layout'
import apiService from './services/API_server'

// Componente para proteger rutas
function PrivateRoute({ children, isAuthenticated }) {
  return isAuthenticated ? children : <Navigate to="/login" />;
}

export default function AppRouter() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay un token al cargar la aplicación
    const verifyAuth = async () => {
      if (apiService.isAuthenticated()) {
        try {
          // Verificar si el token es válido
          const isValid = await apiService.verifyToken();
          setIsAuthenticated(isValid);
        } catch (error) {
          console.error('Error al verificar token:', error);
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    verifyAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#2B7FFF] border-t-transparent"></div>
          <p className="mt-4 text-xl text-[#2B7FFF] font-semibold">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
            <Navigate to="/" /> : 
            <Login setIsAuthenticated={setIsAuthenticated} />
          } 
        />
        
        <Route 
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <Layout setIsAuthenticated={setIsAuthenticated} />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Inicio />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/alertas" element={<Alertas />} />
          <Route path="/visualizacion" element={<Visualizacion />} />
        </Route>

        {/* Ruta por defecto - redirigir al login */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  )
}