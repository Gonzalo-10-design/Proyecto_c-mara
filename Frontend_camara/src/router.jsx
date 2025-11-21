import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Inicio from './componentes/Inicio'
import Contacto from './componentes/Contacto'
import Alertas from './componentes/Alertas'
import Visualizacion from './componentes/Visualizacion'
import Layout from './Layout/Layout'


export default function AppRouter() {
  return (
    <BrowserRouter>
    <Routes>
             <Route element={<Layout/>}>
                <Route path="/" element={<Inicio/>} index/>
                <Route path="/Contacto" element={<Contacto/>} index/>
                <Route path="/Alertas" element={<Alertas/>} index/>
                <Route path="/Visualizacion" element={<Visualizacion/>} index/>
             </Route>
        </Routes>
    </BrowserRouter>
  )
}