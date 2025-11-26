import { Outlet, useLocation } from 'react-router-dom'
import { Header, OpenMVSection } from '../componentes/Header'

export default function Layout({ setIsAuthenticated }) {
  const location = useLocation();

  return (
    <>
      <Header setIsAuthenticated={setIsAuthenticated} />
      
      {/* Mostrar OpenMVSection solo en la ruta de inicio */}
      {location.pathname === "/" && <OpenMVSection />}
      
      <main className="mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </>
  )
}