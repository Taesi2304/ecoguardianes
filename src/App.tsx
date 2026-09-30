import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Header } from './components/Header/Header';
import { Landing } from './components/Landing/Landing';
import { LandingFDMA } from './components/Landing/LandingFDMA';
import { Footer } from './components/Footer/Footer';
import { Informacion } from './components/pages/Informacion';
import Manuales from './components/pages/Manuales';

import AvisoPrivacidad from './components/pages/AvisoPrivacidad';
import TerminosCondiciones from './components/pages/TerminosCondiciones';
import ConectarRedes from './components/pages/ConectarRedes';

import { Login } from './components/pages/Login';
import { Registro } from './components/pages/Registro';

import Inicio from './components/Dashboard/Inicio';
import { DashboardLayout } from './components/Dashboard/DashboardLayout';
import NuevaBitacora from './components/Dashboard/NuevaBitacora';
import MiHistorial from './components/Dashboard/MiHistorial';
import Comunidad from './components/Dashboard/Comunidad';
import Perfil from './components/Dashboard/Perfil';

import AdminDashboard from './components/Admin/AdminDashboard';
import AdminGuard from './components/Guards/AdminGuard';
import AuthGuard from './components/Guards/AuthGuard';

import './App.css';
import { Toaster } from 'react-hot-toast';
import AdminComposteros from './components/Admin/AdminComposteros';
import AdminUsuarios from './components/Admin/AdminUsuarios';
import AdminColonias from './components/Admin/AdminColonias';
import AdminHistorial from './components/Admin/AdminHistorial';
import AdminReportes from './components/Admin/AdminReportes';
import AdminConvocatorias from './components/Admin/AdminConvocatorias';
import AdminPublicaciones from './components/Admin/AdminPublicaciones';
import AdminPaginaInicio from './components/Admin/AdminPaginaInicio';
import AdminAliados from './components/Admin/AdminAliados';
import AdminTalleres from './components/Admin/AdminTalleres';
import AdminCalendario from './components/Admin/AdminCalendario';
import AdminCartelera from './components/Admin/AdminCartelera';
import SuperAdminGuard from './components/Guards/SuperAdminGuard';
import Talleres from './components/pages/Talleres';
import Calendario from './components/pages/Calendario';
import CarteleraPage from './components/Cartelera/CarteleraPage';
import ScrollToTop from './components/ScrollToTop';

// 1. Plantilla para las páginas públicas (Mantiene el Header y Footer)
const PublicLayout = () => {
  return (
    <div className="app-shell min-h-screen flex flex-col bg-[#FFF8DF] text-[#4A2E18]">
      <Header />
      <main className="flex-grow">
        <Outlet /> {/* Aquí se inyectan Landing, Info, Login, etc. */}
      </main>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster position="top-right" />
      <Routes>
        
        {/* === RUTAS PÚBLICAS === */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingFDMA />} />
          <Route path="/ecoguardianes" element={<Landing />} />
          <Route path="/info" element={<Informacion />} />
          <Route path="/manuales" element={<Manuales />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/aviso-privacidad" element={<AvisoPrivacidad />} />
          <Route path="/terminos-condiciones" element={<TerminosCondiciones />} />
          {/* Enlace de un solo uso para que FDMA autorice sus redes (Admin → Publicaciones) */}
          <Route path="/conectar-redes" element={<ConectarRedes />} />
          <Route path="/talleres" element={<Talleres />} />
          <Route path="/calendario" element={<Calendario />} />
        </Route>

        {/* Cartelera a pantalla completa, con su propio diseño oscuro */}
        <Route path="/cartelera" element={<CarteleraPage />} />

       
          {/* === RUTAS DEL DASHBOARD (Privadas, con Sidebar) === */}
        <Route path="/dashboard" element={<AuthGuard />}>
          <Route element={<DashboardLayout />}>
            {/* 'index' es la página por defecto al entrar a /dashboard */}
            <Route index element={<Inicio />} />
            <Route path="mi-historial" element={<MiHistorial />} />
            <Route path="Nueva-Bitacora" element={<NuevaBitacora />} />
            <Route path="Comunidad" element={<Comunidad />} />
            <Route path="Perfil" element={<Perfil />} />
            {/* <Route path="mi-perfil" element={<MiPerfil />} /> ir aqui agregando cosas */}
          </Route>
        </Route>

        {/* <Route path="/admin" element={<AdminGuard />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="/admin/Perfil" element={<Perfil />} />

          </Route>
        </Route> */}

        {/* === RUTAS DEL ADMIN Y SUPER ADMIN === */}
        <Route path="/admin" element={<AdminGuard />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="composteros" element={<AdminComposteros />} />
            <Route path="usuarios" element={<AdminUsuarios />} />
            <Route path="historial" element={<AdminHistorial />} />
            <Route path="reportes" element={<AdminReportes />} />
            <Route path="Nueva-Bitacora" element={<NuevaBitacora />} />
            <Route path="perfil" element={<Perfil />} />

            {/* Solo Super Admin: página pública FDMA y colonias */}
            <Route element={<SuperAdminGuard />}>
              <Route path="pagina" element={<AdminPaginaInicio />} />
              <Route path="convocatorias" element={<AdminConvocatorias />} />
              <Route path="publicaciones" element={<AdminPublicaciones />} />
              <Route path="aliados" element={<AdminAliados />} />
              <Route path="talleres" element={<AdminTalleres />} />
              <Route path="calendario" element={<AdminCalendario />} />
              <Route path="cartelera" element={<AdminCartelera />} />
              <Route path="colonias" element={<AdminColonias />} />
            </Route>
          </Route>
        </Route>



      </Routes>
    </BrowserRouter>
  );
}