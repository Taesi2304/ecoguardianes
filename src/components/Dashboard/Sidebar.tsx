import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

// Recibe la función onClose para cerrar el menú en celulares
export const Sidebar = ({ onClose }: { onClose?: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(() => location.pathname.startsWith('/admin'));
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [cargandoRol, setCargandoRol] = useState(true);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const handleLogout = async () => {
    setCerrandoSesion(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(`No se pudo cerrar sesión: ${error.message}`);
        return;
      }

      onClose?.();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('No se pudo cerrar sesión. Intenta de nuevo.');
    } finally {
      setCerrandoSesion(false);
    }
  };

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

  const menuAdmin = [
    { name: 'Inicio', path: '/admin', icon: '/inicio.svg' },
    { name: 'Registrar Visita', path: '/dashboard/Nueva-Bitacora', icon: '/bitacora.svg' },
    { name: 'Historial', path: '/admin/historial', icon: '/historial.svg' },
    { name: 'Composteros', path: '/admin/composteros', icon: '/compostero.svg' },
    { name: 'Usuarios', path: '/admin/usuarios', icon: '/usuarios.svg' },
    { name: 'Reportes', path: '/admin/reportes', icon: '/reporte.svg' },
    { name: 'Mi Perfil', path: '/admin/perfil', icon: '/usuarios.svg' },
    { name: 'Cerrar Sesión', path: '/login', icon: '/salir.svg' },

  ];

  const menuItems = isAdmin
    ? isSuperAdmin
      ? [
          menuAdmin[0],
          { name: 'Colonias', path: '/admin/colonias', icon: '/comunidad.svg' },
          { name: 'Convocatorias', path: '/admin/convocatorias', icon: '/reporte.svg' },
          ...menuAdmin.slice(1),
        ]
      : menuAdmin
    : menuGuardiana;

  if (cargandoRol) {
    return (
      <aside className="flex h-screen w-64 items-center justify-center bg-[#FFF8DF] border-r border-[#4A2E18]/10">
        <Loader2 className="h-6 w-6 animate-spin text-green-600" />
      </aside>
    );
  }

  return (
    <aside className="sticky top-0 h-screen w-64 bg-[#FFF8DF] border-r border-[#4A2E18]/10 flex flex-col">
      
      {/* Cabecera del Sidebar */}
      <div className="p-6 flex items-center justify-between border-b border-[#4A2E18]/10">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-xl text-[#4A2E18]">Eco Guardianes</span>
        </div>
        
        {/* Botón de cerrar (X) solo aparece en celular */}
        {onClose && (
          <button onClick={onClose} className="md:hidden p-2 hover:bg-[#4A2E18]/5 rounded-lg">
            <img src="/cerrar.svg" alt="Cerrar" className="w-5 h-5 object-contain" />
          </button>
        )}
      </div>

      {/* Lista de Navegación */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            item.name === 'Cerrar Sesión' ? (
              <button
                key={item.name}
                type="button"
                onClick={handleLogout}
                disabled={cerrandoSesion}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-[#4A2E18]/70 transition-colors hover:bg-[#4A2E18]/5 hover:text-[#4A2E18] disabled:cursor-wait disabled:opacity-60"
              >
                <img src={item.icon} alt="" className="h-5 w-5 object-contain opacity-60" />
                {cerrandoSesion ? 'Cerrando sesión...' : item.name}
              </button>
            ) : (
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
            )
          );
        })}
      </nav>
    </aside>
  );
};