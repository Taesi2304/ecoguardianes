import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ItemMenu {
  name: string;
  path: string;
  icon: string;
}

interface GrupoMenu {
  titulo?: string; // sin título = lista fija, sin plegar
  items: ItemMenu[];
}

const CLAVE_GRUPOS = 'sidebar-grupos-abiertos';

function leerGruposGuardados(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_GRUPOS) || '{}');
  } catch {
    return {};
  }
}

// Recibe la función onClose para cerrar el menú en celulares
export const Sidebar = ({ onClose }: { onClose?: () => void }) => {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(() => location.pathname.startsWith('/admin'));
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [cargandoRol, setCargandoRol] = useState(true);
  // true/false = el usuario lo abrió/cerró; sin valor = abierto solo si contiene la página actual
  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>(leerGruposGuardados);

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

  const menuGuardiana: ItemMenu[] = [
    { name: 'Inicio', path: '/dashboard', icon: '/inicio.svg' },
    { name: 'Registrar Visita', path: '/dashboard/Nueva-Bitacora', icon: '/bitacora.svg' },
    { name: 'Historial', path: '/dashboard/Mi-Historial', icon: '/historial.svg' },
    { name: 'Comunidad', path: '/dashboard/Comunidad', icon: '/comunidad.svg' },
  ];

  const menuCompostero: ItemMenu[] = [
    { name: 'Resumen', path: '/admin', icon: '/inicio.svg' },
    { name: 'Registrar Visita', path: '/admin/Nueva-Bitacora', icon: '/bitacora.svg' },
    { name: 'Historial', path: '/admin/historial', icon: '/historial.svg' },
    { name: 'Composteros', path: '/admin/composteros', icon: '/compostero.svg' },
    ...(isSuperAdmin ? [{ name: 'Colonias', path: '/admin/colonias', icon: '/comunidad.svg' }] : []),
    { name: 'Usuarios', path: '/admin/usuarios', icon: '/usuarios.svg' },
    { name: 'Reportes', path: '/admin/reportes', icon: '/reporte.svg' },
  ];

  // Fijos al pie del menú, fuera de los grupos plegables
  const menuCuenta: ItemMenu[] = [
    { name: 'Mi Perfil', path: isAdmin ? '/admin/perfil' : '/dashboard/Perfil', icon: '/usuarios.svg' },
    { name: 'Cerrar Sesión', path: '/login', icon: '/salir.svg' },
  ];

  // Super Admin (FDMA): primero la página y el festival; el compostero es una extensión.
  // "Página web" es lo que se ve todo el año; "Festival", lo del evento y su programa.
  const grupos: GrupoMenu[] = !isAdmin
    ? [{ items: menuGuardiana }]
    : isSuperAdmin
      ? [
          {
            titulo: 'Página web',
            items: [
              { name: 'Página de inicio', path: '/admin/pagina', icon: '/inicio.svg' },
              { name: 'Publicaciones', path: '/admin/publicaciones', icon: '/foto-camara.svg' },
              { name: 'Equipo', path: '/admin/equipo', icon: '/usuarios.svg' },
              { name: 'Aliados', path: '/admin/aliados', icon: '/corazon.svg' },
            ],
          },
          {
            titulo: 'Festival',
            items: [
              { name: 'Convocatorias', path: '/admin/convocatorias', icon: '/reporte.svg' },
              { name: 'Cartelera', path: '/admin/cartelera', icon: '/mapa.svg' },
              { name: 'Talleres', path: '/admin/talleres', icon: '/planta-tierra.svg' },
              { name: 'Calendario', path: '/admin/calendario', icon: '/historial.svg' },
            ],
          },
          { titulo: 'Eco Guardianes', items: menuCompostero },
        ]
      : [{ items: menuCompostero }];

  const rutaActual = location.pathname.toLowerCase();
  const esActivo = (item: ItemMenu) => rutaActual === item.path.toLowerCase();

  function estaAbierto(grupo: GrupoMenu) {
    if (!grupo.titulo) return true;
    return gruposAbiertos[grupo.titulo] ?? grupo.items.some(esActivo);
  }

  function alternarGrupo(grupo: GrupoMenu) {
    if (!grupo.titulo) return;
    const siguiente = { ...gruposAbiertos, [grupo.titulo]: !estaAbierto(grupo) };
    setGruposAbiertos(siguiente);
    try {
      localStorage.setItem(CLAVE_GRUPOS, JSON.stringify(siguiente));
    } catch {
      // Sin almacenamiento (modo privado): solo no se recuerda entre visitas
    }
  }

  if (cargandoRol) {
    return (
      <aside className="flex h-dvh w-full items-center justify-center bg-[#FFF8DF] border-r border-[#4A2E18]/10">
        <Loader2 className="h-6 w-6 animate-spin text-green-600" />
      </aside>
    );
  }

  const enlace = (item: ItemMenu, compacto = false) => {
    const isActive = esActivo(item);
    return (
      <Link
        key={item.name}
        to={item.path}
        onClick={onClose} // Cierra el menú al hacer clic (útil en celular)
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center gap-3 rounded-xl px-4 font-medium transition-colors ${compacto ? 'py-2' : 'py-2.5'} ${
          isActive
            ? 'bg-[#EBF3E8] text-[#2D7A3E] border border-[#2D7A3E]/20 shadow-sm'
            : 'text-[#4A2E18]/70 hover:bg-[#4A2E18]/5 hover:text-[#4A2E18]'
        }`}
      >
        <img
          src={item.icon}
          alt=""
          className={`w-5 h-5 object-contain transition-opacity ${isActive ? 'opacity-100' : 'opacity-60'}`}
        />
        {item.name}
      </Link>
    );
  };

  return (
    <aside className="flex h-dvh w-full flex-col bg-[#FFF8DF] border-r border-[#4A2E18]/10">

      {/* Cabecera del Sidebar */}
      <div className="p-6 flex items-center justify-between border-b border-[#4A2E18]/10">
        <Link to="/" onClick={onClose} aria-label="Ir a la página del Festival" className="flex items-center gap-3 rounded-lg transition-opacity hover:opacity-80">
          <img src="/logo_fdma.svg" alt="" className="h-9 w-9 rounded-full object-contain mix-blend-multiply" />
          <span className="font-bold text-xl text-[#2D6A4F]">FDMA</span>
        </Link>

        {/* Botón de cerrar (X) solo aparece en celular */}
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Cerrar menú" className="lg:hidden p-2 hover:bg-[#4A2E18]/5 rounded-lg">
            <img src="/cerrar.svg" alt="Cerrar" className="w-5 h-5 object-contain" />
          </button>
        )}
      </div>

      {/* Lista de Navegación: grupos plegables */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {grupos.map((grupo, indice) => {
          const abierto = estaAbierto(grupo);
          const idLista = `grupo-menu-${indice}`;
          const tieneActivo = grupo.items.some(esActivo);

          if (!grupo.titulo) {
            return <div key={indice} className="space-y-1">{grupo.items.map((item) => enlace(item))}</div>;
          }

          return (
            <div key={grupo.titulo}>
              <button
                type="button"
                onClick={() => alternarGrupo(grupo)}
                aria-expanded={abierto}
                aria-controls={idLista}
                className="flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#4A2E18]/55 hover:bg-[#4A2E18]/5 hover:text-[#4A2E18]"
              >
                <span className="flex items-center gap-2">
                  {grupo.titulo}
                  {/* Punto verde: la página actual está dentro de este grupo cerrado */}
                  {!abierto && tieneActivo && <span className="h-1.5 w-1.5 rounded-full bg-[#2D7A3E]" aria-hidden="true" />}
                </span>
                <span className="flex items-center gap-2">
                  {!abierto && <span className="font-medium normal-case tracking-normal text-[#4A2E18]/40">{grupo.items.length}</span>}
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
                </span>
              </button>
              {abierto && (
                <div id={idLista} className="mb-2 mt-1 space-y-1">
                  {grupo.items.map((item) => enlace(item, true))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Cuenta: siempre a la vista al pie */}
      <div className="space-y-1 border-t border-[#4A2E18]/10 p-4">
        {menuCuenta.map((item) => enlace(item, true))}
      </div>
    </aside>
  );
};
