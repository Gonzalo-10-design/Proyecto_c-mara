import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Inicio from './componentes/Inicio'
import Contacto from './componentes/Contacto'
import Alertas from './componentes/Alertas'
import Visualizacion from './componentes/Visualizacion'
import Login from './componentes/Login'
import Layout from './Layout/Layout'

// Componente para proteger rutas
function PrivateRoute({ children, isAuthenticated }) {
  return isAuthenticated ? children : <Navigate to="/login" />;
}

export default function AppRouter() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay un token al cargar la aplicación
    const token = localStorage.getItem('token');
    if (token) {
      // Aquí podrías validar el token con el backend
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-[#2B7FFF]">Cargando...</div>
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