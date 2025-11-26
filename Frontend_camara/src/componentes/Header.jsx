// Frontend_camara/src/componentes/Header.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import apiService from '../services/API_server';

function Header({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const user = apiService.getCurrentUser();

  const handleLogout = () => {
    apiService.logout();
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <header className="w-full bg-[#2B7FFF] p-3 md:p-5 flex justify-between items-center border-b-4 border-[#1ea34a]">
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src="/src/assets/imagenes/Logo_isateck.jpeg" alt="Isateck Logo" className="w-[100px] h-auto rounded-lg" />
          <h1 className="text-white text-4xl font-extrabold tracking-wide">ISATECK</h1>
        </div>

        {/* Enlaces de navegación */}
        <nav className="flex gap-6 items-center">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `text-white text-xl font-medium transition duration-300 hover:text-[#1ea34a] ${isActive ? 'text-[#1ea34a] border-b-2 border-[#1ea34a]' : ''}`
            }
          >
            Inicio
          </NavLink>
          <NavLink 
            to="/visualizacion" 
            className={({ isActive }) => 
              `text-white text-xl font-medium transition duration-300 hover:text-[#1ea34a] ${isActive ? 'text-[#1ea34a] border-b-2 border-[#1ea34a]' : ''}`
            }
          >
            Visualización
          </NavLink>
          <NavLink 
            to="/alertas" 
            className={({ isActive }) => 
              `text-white text-xl font-medium transition duration-300 hover:text-[#1ea34a] ${isActive ? 'text-[#1ea34a] border-b-2 border-[#1ea34a]' : ''}`
            }
          >
            Alertas
          </NavLink>
          <NavLink 
            to="/contacto" 
            className={({ isActive }) => 
              `text-white text-xl font-medium transition duration-300 hover:text-[#1ea34a] ${isActive ? 'text-[#1ea34a] border-b-2 border-[#1ea34a]' : ''}`
            }
          >
            Contacto
          </NavLink>

          {/* Usuario y Logout */}
          <div className="flex items-center gap-3 ml-4 border-l border-white pl-4">
            <span className="text-white text-sm flex items-center gap-2">
              <i className="fas fa-user-circle text-xl"></i>
              <span>
                Bienvenido, <span className="font-bold">{user?.username || 'Usuario'}</span>
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition duration-300 font-medium flex items-center gap-2"
            >
              <i className="fas fa-sign-out-alt"></i>
              Cerrar Sesión
            </button>
          </div>
        </nav>
        
      </div>
    </header>
  );
}

function OpenMVSection() {
  
}

export { Header, OpenMVSection };