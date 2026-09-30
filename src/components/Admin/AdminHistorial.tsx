import React, { useEffect, useState } from 'react';
import { Loader2, Search, AlertTriangle, Bug, MapPin, User, Calendar, Sprout, FileText, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';

interface VisitaHistorial {
  id: string;
  fecha: string;
  cantidad_material: number | null;
  unidad_medida: string | null;
  lixiviados: boolean;
  plagas: boolean;
  observaciones: string | null;
  composteros: {
    codigo: string;
    nombre: string;
    colonia_id: string | null;
    colonias: { nombre: string } | null;
  };
  usuarios: {
    nombre: string;
    apellido_paterno: string | null;
  };
  catalogo_acciones: { nombre: string } | null;
  catalogo_etapas: { nombre: string } | null;
  evidencias: { url_publica: string; tipo_evidencia: string }[];
}

export default function AdminHistorial() {
  const [visitas, setVisitas] = useState<VisitaHistorial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroColonia, setFiltroColonia] = useState('todos');
  const [filtroCompostero, setFiltroCompostero] = useState('todos');
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

      // Se agregaron 'observaciones' y la relación con 'evidencias'
      let query = supabase
        .from('visitas')
        .select(`
          id,
          fecha,
          cantidad_material,
         unidad_medida,
          lixiviados,
          plagas,
          observaciones,
          composteros!inner (codigo, nombre, colonia_id, colonias(nombre)),
          usuarios (nombre, apellido_paterno),
          catalogo_acciones (nombre),
          catalogo_etapas (nombre),
          evidencias (url_publica, tipo_evidencia)
        `)
        .order('fecha', { ascending: false });

      if (!superAdmin && adminColoniaId) {
        query = query.eq('composteros.colonia_id', adminColoniaId);
      }

      const { data: dataVisitas, error: errVisitas } = await query;
      if (errVisitas) throw errVisitas;

      setVisitas(dataVisitas as unknown as VisitaHistorial[]);
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

  const visitasFiltradas = visitas.filter(v => {
    const coincideBusqueda =
      v.composteros.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.composteros.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.usuarios.nombre.toLowerCase().includes(busqueda.toLowerCase());

    const coincideColonia = filtroColonia === 'todos' || v.composteros.colonia_id === filtroColonia;
    const coincideCompostero = filtroCompostero === 'todos' || v.composteros.codigo === filtroCompostero;

    return coincideBusqueda && coincideColonia && coincideCompostero;
  });

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
            placeholder="Buscar por código o usuaria..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:w-80"
          />
        </div>
      </div>

      <Card className="mb-6 border-transparent bg-white shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
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
        </CardContent>
      </Card>

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
                <div>
                  <p className="flex items-start gap-2 font-semibold capitalize text-gray-800">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>{new Date(v.fecha).toLocaleString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                  </p>
                  <span className="mt-2 inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-green-800">Registro comunal</span>
                </div>
                <span className="inline-flex w-fit items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                  <Sprout className="h-4 w-4" /> +{v.cantidad_material || 0} {v.unidad_medida === 'litros' ? 'L' : 'kg'}
                </span>
              </div>

              <CardContent className="space-y-5 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Compostero</p>
                  <p className="mt-1 font-bold text-green-700">{v.composteros.codigo}</p>
                  <p className="font-medium text-gray-800">{v.composteros.nombre}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-gray-500"><MapPin className="h-3.5 w-3.5" /> {v.composteros.colonias?.nombre || 'Sin colonia'}</p>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Eco Guardian</p>
                  <p className="mt-1 flex items-center gap-2 font-medium text-gray-700"><User className="h-4 w-4 text-gray-400" /> {v.usuarios.nombre} {v.usuarios.apellido_paterno}</p>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Detalles y evidencia</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {v.catalogo_acciones?.nombre && <span className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{v.catalogo_acciones.nombre}</span>}
                    {v.catalogo_etapas?.nombre && <span className="rounded border border-purple-100 bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">{v.catalogo_etapas.nombre}</span>}
                  </div>
                  {v.observaciones && <p className="mt-3 whitespace-pre-wrap text-sm italic text-gray-600">“{v.observaciones}”</p>}
                  {v.evidencias?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {v.evidencias.map((ev, idx) => (
                        <button key={idx} type="button" onClick={() => setImagenSeleccionada(ev.url_publica)} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm transition hover:border-green-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2" title="Ver evidencia completa" aria-label="Ver evidencia completa">
                          {ev.tipo_evidencia === 'foto' || ev.url_publica.match(/\.(jpeg|jpg|gif|png)$/i) ? <img src={ev.url_publica} alt="Evidencia" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center text-gray-400 group-hover:text-green-600"><FileText className="h-6 w-6" /></div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Alertas</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {v.plagas && <span className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700"><Bug className="h-3.5 w-3.5" /> Plagas</span>}
                    {v.lixiviados && <span className="flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700"><AlertTriangle className="h-3.5 w-3.5" /> Lixiviados</span>}
                    {!v.plagas && !v.lixiviados && <span className="text-sm text-gray-400">Sin alertas</span>}
                  </div>
                </div>
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
