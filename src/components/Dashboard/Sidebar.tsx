import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Recibe la función onClose para cerrar el menú en celulares
export const Sidebar = ({ onClose }: { onClose?: () => void }) => {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(() => location.pathname.startsWith('/admin'));
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [cargandoRol, setCargandoRol] = useState(true);

  useEffect(() => {
    const cargarRol = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { data: usuario } = await supabase
          .from('usuarios')
          .select('roles(nombre)')
          .eq('auth_user_id', user.id)
          .single();

        const roles = usuario?.roles as { nombre?: string } | { nombre?: string }[] | null;
        const rol = Array.isArray(roles)
          ? roles[0]?.nombre
          : roles?.nombre;

        setIsAdmin(rol === 'Administrador' || rol === 'Super Admin');
        setIsSuperAdmin(rol === 'Super Admin');
      } finally {
        setCargandoRol(false);
      }
    };

    cargarRol();
  }, []);

  const menuGuardiana = [
    { name: 'Inicio', path: '/dashboard', icon: '/inicio.svg' },
    { name: 'Registrar Visita', path: '/dashboard/Nueva-Bitacora', icon: '/bitacora.svg' },
    { name: 'Historial', path: '/dashboard/Mi-Historial', icon: '/historial.svg' },
    { name: 'Comunidad', path: '/dashboard/Comunidad', icon: '/comunidad.svg' },
    { name: 'Mi Perfil', path: '/dashboard/Perfil', icon: '/usuarios.svg' },
    { name: 'Cerrar Sesión', path: '/login', icon: '/salir.svg' },
  ];

  const menuCompostero = [
    { name: 'Resumen', path: '/admin', icon: '/inicio.svg' },
    { name: 'Registrar Visita', path: '/dashboard/Nueva-Bitacora', icon: '/bitacora.svg' },
    { name: 'Historial', path: '/admin/historial', icon: '/historial.svg' },
    { name: 'Composteros', path: '/admin/composteros', icon: '/compostero.svg' },
    ...(isSuperAdmin ? [{ name: 'Colonias', path: '/admin/colonias', icon: '/comunidad.svg' }] : []),
    { name: 'Usuarios', path: '/admin/usuarios', icon: '/usuarios.svg' },
    { name: 'Reportes', path: '/admin/reportes', icon: '/reporte.svg' },
  ];

  const menuCuenta = [
    { name: 'Mi Perfil', path: '/admin/perfil', icon: '/usuarios.svg' },
    { name: 'Cerrar Sesión', path: '/login', icon: '/salir.svg' },
  ];

  // Super Admin (FDMA): primero la página del festival; el compostero es una extensión
  const menuPagina = [
    { name: 'Página de inicio', path: '/admin/pagina', icon: '/inicio.svg' },
    { name: 'Cartelera', path: '/admin/cartelera', icon: '/mapa.svg' },
    { name: 'Talleres', path: '/admin/talleres', icon: '/planta-tierra.svg' },
    { name: 'Calendario', path: '/admin/calendario', icon: '/historial.svg' },
    { name: 'Convocatorias', path: '/admin/convocatorias', icon: '/reporte.svg' },
    { name: 'Publicaciones', path: '/admin/publicaciones', icon: '/foto-camara.svg' },
    { name: 'Aliados', path: '/admin/aliados', icon: '/corazon.svg' },
  ];

  const grupos: { titulo?: string; items: typeof menuGuardiana }[] = !isAdmin
    ? [{ items: menuGuardiana }]
    : isSuperAdmin
      ? [
          { titulo: 'Página del Festival', items: menuPagina },
          { titulo: 'Eco Guardianes', items: menuCompostero },
          { titulo: 'Cuenta', items: menuCuenta },
        ]
      : [
          { items: menuCompostero },
          { titulo: 'Cuenta', items: menuCuenta },
        ];

  if (cargandoRol) {
    return (
      <aside className="flex h-dvh w-full items-center justify-center bg-[#FFF8DF] border-r border-[#4A2E18]/10">
        <Loader2 className="h-6 w-6 animate-spin text-green-600" />
      </aside>
    );
  }

  return (
    <aside className="flex h-dvh w-full flex-col bg-[#FFF8DF] border-r border-[#4A2E18]/10">
      
      {/* Cabecera del Sidebar */}
      <div className="p-6 flex items-center justify-between border-b border-[#4A2E18]/10">
        <div className="flex items-center gap-3">
          {isSuperAdmin ? (
            <>
              <img src="/logo_fdma.svg" alt="" className="h-9 w-9 rounded-full object-contain mix-blend-multiply" />
              <span className="font-bold text-xl text-[#2D6A4F]">FDMA</span>
            </>
          ) : (
            <>
              <img src="/logo.svg" alt="Logo" className="w-8 h-8 object-contain" />
              <span className="font-bold text-xl text-[#4A2E18]">Eco Guardianes</span>
            </>
          )}
        </div>
        
        {/* Botón de cerrar (X) solo aparece en celular */}
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Cerrar menú" className="lg:hidden p-2 hover:bg-[#4A2E18]/5 rounded-lg">
            <img src="/cerrar.svg" alt="Cerrar" className="w-5 h-5 object-contain" />
          </button>
        )}
      </div>

      {/* Lista de Navegación */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {grupos.map((grupo, indice) => (
          <div key={grupo.titulo || indice} className="space-y-2">
            {grupo.titulo && (
              <p className={`px-4 pb-1 text-xs font-bold uppercase tracking-wider text-[#4A2E18]/45 ${indice > 0 ? 'mt-3 border-t border-[#4A2E18]/10 pt-4' : ''}`}>
                {grupo.titulo}
              </p>
            )}
            {grupo.items.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={onClose} // Cierra el menú al hacer clic (útil en celular)
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                isActive 
                  ? 'bg-[#EBF3E8] text-[#2D7A3E] border border-[#2D7A3E]/20 shadow-sm' 
                  : 'text-[#4A2E18]/70 hover:bg-[#4A2E18]/5 hover:text-[#4A2E18]'
              }`}
            >
              <img 
                src={item.icon} 
                alt={item.name} 
                className={`w-5 h-5 object-contain transition-opacity ${isActive ? 'opacity-100' : 'opacity-60'}`} 
              />
              {item.name}
            </Link>
          );
            })}
          </div>
        ))}
      </nav>

      {/* Botón Salir
      <div className="p-4 border-t border-[#4A2E18]/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <img src="/salir.svg" alt="Cerrar Sesión" className="w-5 h-5 object-contain opacity-70" />
          Cerrar Sesión
        </button>
      </div> */}
    </aside>
  );
};