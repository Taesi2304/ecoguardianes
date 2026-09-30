import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, Users, Warehouse, Map, ArrowRight, ClipboardList } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Compostero = {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string | null;
  estado: string | null;
  created_at: string;
  colonias: { nombre: string }; // Corregido: Es un objeto, no un arreglo
};

type Metricas = {
  composteros: number;
  usuarios: number;
  colonias: number;
};

export default function AdminDashboard() {
  const whatsappGroupLink = 'https://chat.whatsapp.com/JmNLCT0TpYK9TqjfawWLdd?s=cl&p=i&mlu=0';

  const [composteros, setComposteros] = useState<Compostero[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);
  const [nombreZona, setNombreZona] = useState('todas las zonas');
  const [metricas, setMetricas] = useState<Metricas>({ composteros: 0, usuarios: 0, colonias: 0 });

  useEffect(() => {
    const cargarDatos = async (mostrarCarga = true) => {
      if (mostrarCarga) setCargando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('No hay una sesión activa.');
        if (mostrarCarga) setCargando(false);
        return;
      }

      // 1. Obtener perfil del admin
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('colonia_id, roles(nombre), colonias(nombre)')
        .eq('auth_user_id', user.id)
        .single();

      if (usuarioError || !usuario) {
        setError('No se pudo verificar el perfil administrativo.');
        if (mostrarCarga) setCargando(false);
        return;
      }

      // 2. Determinar permisos
      const rolNombre = Array.isArray(usuario.roles) ? usuario.roles[0]?.nombre : (usuario.roles as any)?.nombre;
      const superAdmin = rolNombre === 'Super Admin';
      setEsSuperAdmin(superAdmin);
      
      const coloniaNombre = Array.isArray(usuario.colonias) ? usuario.colonias[0]?.nombre : (usuario.colonias as any)?.nombre;
      setNombreZona(superAdmin ? 'todas las zonas' : coloniaNombre || 'tu colonia');
      const coloniaId = usuario.colonia_id;

      // 3. Consultas a la BD
      let composterosQuery = supabase
        .from('composteros')
        .select('id, codigo, nombre, direccion, estado, created_at, colonias(nombre)', { count: 'exact' })
        .eq('activo', true)
        .order('codigo');

      let usuariosQuery = supabase
        .from('usuarios')
        .select('id, roles!inner(nombre)', { count: 'exact', head: true })
        .eq('activo', true)
        .eq('roles.nombre', 'Eco Guardian'); // Solo cuenta a las guardianas

      let coloniasQuery = supabase
        .from('colonias')
        .select('id', { count: 'exact', head: true })
        .eq('activo', true);

      // Si es Admin normal, filtrar todo por su colonia
      if (!superAdmin && coloniaId) {
        composterosQuery = composterosQuery.eq('colonia_id', coloniaId);
        usuariosQuery = usuariosQuery.eq('colonia_id', coloniaId);
      }

      const [
        { data: composterosData, count: composterosCount, error: compError }, 
        { count: usuariosCount }, 
        { count: coloniasCount }
      ] = await Promise.all([ composterosQuery, usuariosQuery, coloniasQuery ]);

      if (compError) {
        setError('No se pudieron cargar los datos.');
      } else {
        setComposteros((composterosData || []) as unknown as Compostero[]);
        setMetricas({
          composteros: composterosCount || 0,
          usuarios: usuariosCount || 0,
          colonias: coloniasCount || 0,
        });
      }

      if (mostrarCarga) setCargando(false);
    };

    cargarDatos();

    const canal = supabase
      .channel('cambios-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => {
        cargarDatos(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'composteros' }, () => {
        cargarDatos(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colonias' }, () => {
        cargarDatos(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  if (cargando) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-gray-600">
        <Loader2 className="h-7 w-7 animate-spin text-green-600" />
        Cargando panel...
      </div>
    );
  }

  const metricasCards = [
    { label: 'Composteros activos', value: metricas.composteros, path: '/admin/composteros', icon: Warehouse, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Eco Guardianas', value: metricas.usuarios, path: '/admin/usuarios', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    ...(esSuperAdmin ? [{ label: 'Colonias registradas', value: metricas.colonias, path: '/admin/colonias', icon: Map, color: 'text-purple-600', bg: 'bg-purple-100' }] : []),
  ];

  return (
    <div className="mx-auto max-w-6xl py-2 sm:py-4 animate-in fade-in duration-500">
      
      {/* Cabecera */}
      <div className="mb-8 flex items-center gap-4 border-b border-[#4A2E18]/10 pb-5">
        <div className="rounded-full bg-[#CFE9D6] p-3 shadow-sm">
          <img src="/logo.svg" alt="Administrador" className="h-12 w-12 object-contain" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">Panel Administrativo</h1>
          <p className="mt-1 font-medium text-green-700">Resumen operativo de {nombreZona}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">Comunidad</p>
          <h2 className="mt-1 text-lg font-bold text-gray-900">Grupo de WhatsApp</h2>
        </div>
        <a
          href={whatsappGroupLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1fad56]"
        >
          Unirme a la comunidad
        </a>
      </div>

      {/* Tarjetas Redirigibles */}
      <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {metricasCards.map(({ label, value, path, icon: Icon, color, bg }) => (
          <Link key={label} to={path} className="group block">
            <Card className="h-full border-transparent bg-white shadow-sm transition-all hover:shadow-md hover:border-green-200">
              <CardContent className="p-6 flex flex-col h-full justify-between">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                    <p className="mt-2 text-4xl font-bold text-gray-900">{value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${bg}`}>
                    <Icon className={`h-6 w-6 ${color}`} />
                  </div>
                </div>
                <div className="flex items-center text-sm font-semibold text-green-800 opacity-30 group-hover:opacity-100 transition-opacity">
                  Gestionar <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Tabla de Composteros */}
      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center font-medium text-red-700">{error}</CardContent>
        </Card>
      ) : composteros.length === 0 ? (
        <Card className="border-dashed border-gray-300">
          <CardContent className="p-12 text-center text-gray-500">
            <Warehouse className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            Aún no hay composteros registrados en esta zona.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-white px-6 py-5">
            <CardTitle className="text-lg text-gray-800 flex items-center gap-2">

              <ClipboardList className="h-5 w-5 text-green-600" />
              Lista de Composteros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Código</th>
                    <th className="px-6 py-4 font-semibold">Compostero</th>
                    <th className="px-6 py-4 font-semibold">Colonia</th>
                    <th className="px-6 py-4 font-semibold">Ubicación</th>
                    <th className="px-6 py-4 font-semibold">Registro</th>
                    <th className="px-6 py-4 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {composteros.map((compostero) => (
                    <tr key={compostero.id} className="transition-colors hover:bg-green-50/30">
                      <td className="px-6 py-4 font-bold text-green-700">{compostero.codigo}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{compostero.nombre}</td>
                      <td className="px-6 py-4 text-gray-600">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          {/* Corregido para leer correctamente el objeto desde Supabase */}
                          {compostero.colonias?.nombre || 'Sin colonia'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{compostero.direccion || 'No especificada'}</td>
                      <td className="px-6 py-4 text-gray-500 text-sm"> {/* <-- Nuevo dato formatado */}
                        {new Date(compostero.created_at).toLocaleDateString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                          {compostero.estado || 'Activo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}