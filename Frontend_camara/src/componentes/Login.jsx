// Frontend_camara/src/componentes/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/API_server';

export default function Login({ setIsAuthenticated }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login
        const response = await apiService.login({
          username: formData.username,
          password: formData.password
        });

        console.log('Login exitoso:', response);
        setIsAuthenticated(true);
        navigate('/');
      } else {
        // Registro
        await apiService.register({
          username: formData.username,
          email: formData.email,
          password: formData.password
        });

        // Cambiar a modo login después del registro
        setIsLogin(true);
        setFormData({ username: '', password: '', email: '' });
        alert('Usuario registrado exitosamente. Por favor inicia sesión.');
      }
    } catch (err) {
      setError(err.message || 'Error en la operación');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2B7FFF] to-[#1ea34a] px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-8">
        <div className="text-center mb-8">
          <img 
            src="/src/assets/imagenes/Logo_isateck.jpeg" 
            alt="Isateck Logo" 
            className="w-24 h-24 mx-auto mb-4 rounded-full"
          />
          <h2 className="text-3xl font-bold text-[#0f3d28]">
            {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
          </h2>
          <p className="text-gray-600 mt-2">
            {isLogin 
              ? 'Accede a tu cuenta de ISATECK' 
              : 'Crea una nueva cuenta en ISATECK'}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Usuario
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2B7FFF] focus:border-transparent"
              placeholder="Tu usuario"
            />
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2B7FFF] focus:border-transparent"
                placeholder="tu@email.com"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2B7FFF] focus:border-transparent"
              placeholder="Tu contraseña (mínimo 6 caracteres)"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2B7FFF] text-white py-3 rounded-lg font-semibold hover:bg-[#1ea34a] transition duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setFormData({ username: '', password: '', email: '' });
              setError('');
            }}
            className="text-[#2B7FFF] hover:text-[#1ea34a] font-medium"
          >
            {isLogin 
              ? '¿No tienes cuenta? Regístrate' 
              : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}