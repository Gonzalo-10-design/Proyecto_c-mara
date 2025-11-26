import { NavLink, useNavigate } from 'react-router-dom';

function Header({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <header className="w-full bg-[#2B7FFF] p-3 md:p-5 flex justify-between items-center border-b-4 border-[#1ea34a]">
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src={"src/assets/imagenes/Logo_isateck.jpeg"} alt="Isateck Logo" className="w-[100px] h-auto" />
          <h1 className="text-white text-4xl font-extrabold tracking-wide">ISATECK</h1>
        </div>

        {/* Enlaces de navegación */}
        <nav className="flex gap-6 items-center">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `text-white text-xl font-medium transition duration-300 hover:text-[#1ea34a] ${isActive ? 'text-[#1ea34a]' : ''}`
            }
          >
            Inicio
          </NavLink>
          <NavLink 
            to="/visualizacion" 
            className={({ isActive }) => 
              `text-white text-xl font-medium transition duration-300 hover:text-[#1ea34a] ${isActive ? 'text-[#1ea34a]' : ''}`
            }
          >
            Visualización
          </NavLink>
          <NavLink 
            to="/alertas" 
            className={({ isActive }) => 
              `text-white text-xl font-medium transition duration-300 hover:text-[#1ea34a] ${isActive ? 'text-[#1ea34a]' : ''}`
            }
          >
            Alertas
          </NavLink>
          <NavLink 
            to="/contacto" 
            className={({ isActive }) => 
              `text-white text-xl font-medium transition duration-300 hover:text-[#1ea34a] ${isActive ? 'text-[#1ea34a]' : ''}`
            }
          >
            Contacto
          </NavLink>

          {/* Usuario y Logout */}
          <div className="flex items-center gap-3 ml-4 border-l border-white pl-4">
            <span className="text-white text-sm">
              Bienvenido, <span className="font-bold">{user.username}</span>
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition duration-300 font-medium"
            >
              Cerrar Sesión
            </button>
          </div>
        </nav>
        
      </div>
    </header>
  );
}

function OpenMVSection() {
  return (
    <section className="w-full bg-gray-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f3d28] mb-8">
          OpenMV: ¿Qué es?
        </h2>
        <p className="text-lg sm:text-xl text-gray-700 mb-6">
          OpenMV es una plataforma de visión por computadora que permite a los desarrolladores crear aplicaciones inteligentes utilizando cámaras y sensores compactos. Su software de código abierto y la facilidad de uso lo convierten en una excelente opción para proyectos en IoT, robótica y monitoreo visual.
        </p>

        <div className="mb-8">
          <img 
            src="src/assets/imagenes/openmv_example.png" 
            alt="OpenMV Camera"
            className="w-full max-w-md mx-auto rounded-lg shadow-lg"
          />
        </div>

        <h3 className="text-2xl font-semibold text-[#0f3d28] mb-4">
          OpenMV Cam RT1062
        </h3>
        <p className="text-lg sm:text-xl text-gray-700 mb-6">
          La cámara OpenMV Cam RT1062 es una cámara de visión por computadora compacta con capacidades de procesamiento que permite realizar tareas como detección de objetos, reconocimiento facial y más, todo con bajo consumo de energía y fácil integración.
        </p>

        <div className="mb-8">
          <img 
            src="src/assets/imagenes/openmv_cam_rt1062.jpg" 
            alt="OpenMV Cam RT1062"
            className="w-full max-w-md mx-auto rounded-lg shadow-lg"
          />
        </div>
      </div>
    </section>
  );
}

export { Header, OpenMVSection };