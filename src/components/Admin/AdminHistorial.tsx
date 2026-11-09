import React, { useEffect, useState } from 'react';
import { Loader2, Search, AlertTriangle, MapPin, User, Calendar, Sprout, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { CAMPOS_VISITA, formatearCantidad, sumarPorUnidad, type VisitaBitacora } from '@/lib/bitacora';
import DetalleVisita from '@/components/Dashboard/DetalleVisita';

interface VisitaHistorial extends VisitaBitacora {
  composteros: {
    codigo: string;
    nombre: string;
    colonia_id: string | null;
    colonias: { nombre: string } | null;
  };
  usuarios: {
    nombre: string;
    apellido_paterno: string | null;
  } | null;
}

export default function AdminHistorial() {
  const [visitas, setVisitas] = useState<VisitaHistorial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroColonia, setFiltroColonia] = useState('todos');
  const [filtroCompostero, setFiltroCompostero] = useState('todos');
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);
  const [imagenSeleccionada, setImagenSeleccionada] = useState<string | null>(null);

  useEffect(() => {
    cargarHistorial();
  }, []);

  useEffect(() => {
    const manejarTecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setImagenSeleccionada(null);
      }
    };

    window.addEventListener('keydown', manejarTecla);

    return () => {
      window.removeEventListener('keydown', manejarTecla);
    };
  }, []);

  const cargarHistorial = async () => {
    setCargando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay sesión');

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('colonia_id, roles(nombre)')
        .eq('auth_user_id', user.id)
        .single();

      const rolNombre = Array.isArray(usuario?.roles) ? usuario.roles[0]?.nombre : (usuario?.roles as any)?.nombre;
      const superAdmin = rolNombre === 'Super Admin';
      setEsSuperAdmin(superAdmin);
      const adminColoniaId = usuario?.colonia_id;

      let query = supabase
        .from('visitas')
        .select(`
          ${CAMPOS_VISITA},
          composteros!inner (codigo, nombre, colonia_id, colonias(nombre)),
          usuarios (nombre, apellido_paterno),
          evidencias (url_publica)
        `)
        .is('deleted_at', null)
        .order('fecha', { ascending: false });

      if (!superAdmin && adminColoniaId) {
        query = query.eq('composteros.colonia_id', adminColoniaId);
      }

      const { data: dataVisitas, error: errVisitas } = await query;
      if (errVisitas) throw errVisitas;

      setVisitas((dataVisitas as unknown as VisitaHistorial[]) || []);
    } catch (err: any) {
      setError('Error al cargar el historial.');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const coloniasDisponibles = Array.from(
    new Map(
      visitas
        .filter(v => v.composteros?.colonias?.nombre)
        .map(v => [v.composteros.colonia_id || v.composteros.colonias?.nombre || '', v.composteros.colonias?.nombre || ''])
    ).entries()
  ).map(([id, nombre]) => ({ id, nombre }));

  const composterosDisponibles = Array.from(
    new Map(
      visitas.map(v => [v.composteros.codigo, {
        id: v.composteros.codigo,
        nombre: v.composteros.nombre,
        colonia_id: v.composteros.colonia_id
      }])
    ).values()
  );

  const texto = busqueda.trim().toLowerCase();
  const visitasFiltradas = visitas.filter(v => {
    const autor = `${v.usuarios?.nombre ?? ''} ${v.usuarios?.apellido_paterno ?? ''}`.toLowerCase();
    const coincideBusqueda = !texto ||
      v.composteros.codigo.toLowerCase().includes(texto) ||
      v.composteros.nombre.toLowerCase().includes(texto) ||
      autor.includes(texto);

    const coincideColonia = filtroColonia === 'todos' || v.composteros.colonia_id === filtroColonia;
    const coincideCompostero = filtroCompostero === 'todos' || v.composteros.codigo === filtroCompostero;
    const coincideAlerta = !soloAlertas || v.plagas || v.lixiviados;

    return coincideBusqueda && coincideColonia && coincideCompostero && coincideAlerta;
  });

  const totales = sumarPorUnidad(visitasFiltradas);

  if (cargando && visitas.length === 0) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-green-600" /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl py-2 sm:py-4 animate-in fade-in duration-500">

      <div className="mb-8 flex flex-col gap-4 border-b border-[#4A2E18]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">Historial Comunal</h1>
          <p className="mt-1 font-medium text-green-700">
            {esSuperAdmin ? 'Registro global de todas las zonas operativas' : 'Registro de bitácoras de tu zona operativa'}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código o Eco Guardián..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:w-80"
          />
        </div>
      </div>

      <Card className="mb-6 border-transparent bg-white shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <MapPin className="h-4 w-4 text-green-600" /> Colonia:
            </div>
            <select
              value={filtroColonia}
              onChange={(e) => {
                setFiltroColonia(e.target.value);
                setFiltroCompostero('todos');
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
            >
              <option value="todos">Todas</option>
              {coloniasDisponibles.map((colonia) => (
                <option key={colonia.id} value={colonia.id}>{colonia.nombre}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Sprout className="h-4 w-4 text-green-600" /> Compostero:
            </div>
            <select
              value={filtroCompostero}
              onChange={(e) => setFiltroCompostero(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
            >
              <option value="todos">Todos</option>
              {composterosDisponibles
                .filter(comp => filtroColonia === 'todos' || comp.colonia_id === filtroColonia)
                .map((comp) => (
                  <option key={comp.id} value={comp.id}>{comp.nombre}</option>
                ))}
            </select>
          </div>

          <button
            type="button"
            aria-pressed={soloAlertas}
            onClick={() => setSoloAlertas((actual) => !actual)}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              soloAlertas ? 'border-red-600 bg-red-600 text-white' : 'border-red-200 bg-white text-red-700 hover:bg-red-50'
            }`}
          >
            <AlertTriangle className="h-4 w-4" /> Solo con alertas
          </button>
        </CardContent>
      </Card>

      <p className="mb-4 text-sm text-gray-600">
        {visitasFiltradas.length} registro{visitasFiltradas.length === 1 ? '' : 's'}
        {' · '}<strong className="text-gray-800">{formatearCantidad(totales.kg, 'kg')}</strong>
        {totales.litros > 0 && <>{' · '}<strong className="text-gray-800">{formatearCantidad(totales.litros, 'litros')}</strong></>}
      </p>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 font-medium text-red-700">{error}</div>
      )}

      {visitasFiltradas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">No se encontraron registros en el historial.</CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {visitasFiltradas.map((v) => (
            <Card key={v.id} className="overflow-hidden border-transparent bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <p className="flex items-start gap-2 font-semibold capitalize text-gray-800">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>{new Date(v.fecha).toLocaleString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                    <span className="font-bold text-green-700">{v.composteros.codigo}</span>
                    <span className="font-medium text-gray-800">{v.composteros.nombre}</span>
                    <span className="flex items-center gap-1 text-gray-500"><MapPin className="h-3.5 w-3.5" /> {v.composteros.colonias?.nombre || 'Sin colonia'}</span>
                  </p>
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4 text-gray-400" />
                    {v.usuarios ? `${v.usuarios.nombre} ${v.usuarios.apellido_paterno || ''}`.trim() : 'Usuario eliminado'}
                  </p>
                </div>
                <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                  <Sprout className="h-4 w-4" /> +{formatearCantidad(v.cantidad_material, v.unidad_medida)}
                </span>
              </div>

              <CardContent className="p-5">
                <DetalleVisita visita={v} onVerFoto={setImagenSeleccionada} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {imagenSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={() => setImagenSeleccionada(null)}>
          <div className="relative flex w-full max-w-4xl items-center justify-center">
            <button type="button" onClick={() => setImagenSeleccionada(null)} className="absolute -top-3 right-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-lg transition hover:bg-white" aria-label="Cerrar vista previa">
              <X className="h-5 w-5" />
            </button>
            <img src={imagenSeleccionada} alt="Evidencia del compostero en tamaño completo" className="max-h-[80vh] w-full max-w-full rounded-2xl object-contain shadow-2xl" onClick={(event) => event.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  );
}
