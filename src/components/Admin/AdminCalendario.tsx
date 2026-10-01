import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertCircle, ArrowRight, Edit, Eye, EyeOff, Loader2, Plus, Save, Tags, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatearFecha, formatearHora } from '@/lib/utils';
import { cargarCategorias, cargarEventos as cargarEventosPublicos, estiloPunto } from '@/components/Calendario/eventos';
import type { CategoriaCalendario } from '@/components/Calendario/eventos';
import { EditorCatalogo } from './EditorCatalogo';

interface Evento {
  id: string;
  titulo: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  lugar: string | null;
  categoria_id: string | null;
  descripcion: string | null;
  enlace_url: string | null;
  activo: boolean;
  origen?: Origen; // Solo en los automáticos: se editan en su propia sección
}

// Eventos que el calendario arma solo a partir de otras secciones del admin
const ORIGENES = {
  taller: { seccion: 'Talleres', ruta: '/admin/talleres' },
  festival: { seccion: 'Cartelera', ruta: '/admin/cartelera' },
  convocatoria: { seccion: 'Convocatorias', ruta: '/admin/convocatorias' },
} as const;
type Origen = keyof typeof ORIGENES;
const origenDe = (id: string) => (Object.keys(ORIGENES) as Origen[]).find((origen) => id.startsWith(`${origen}-`));

// Una presentación del festival se edita en la Cartelera, filtrada en ese día (y en su edición)
function rutaOrigen(evento: Evento & { origen: Origen }) {
  if (evento.origen !== 'festival') return ORIGENES[evento.origen].ruta;
  const parametros = new URLSearchParams({ fecha: evento.fecha });
  const anio = evento.enlace_url?.match(/edicion=(\d{4})/)?.[1];
  if (anio) parametros.set('edicion', anio);
  return `${ORIGENES.festival.ruta}?${parametros}`;
}

interface FormularioEvento {
  titulo: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  categoria_id: string;
  descripcion: string;
  enlace_url: string;
}

const formularioInicial: FormularioEvento = {
  titulo: '',
  fecha: '',
  hora_inicio: '',
  hora_fin: '',
  lugar: '',
  categoria_id: '',
  descripcion: '',
  enlace_url: '',
};

const claseInput = 'mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none';
const hoy = () => new Date().toLocaleDateString('en-CA');

// Palabras con significado de un título, sin acentos ni mayúsculas ("Recorrido en Bici" → recorrido, bici)
const palabrasClave = (texto: string) => texto
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .split(/[^a-z0-9ñ]+/)
  .filter((palabra) => palabra.length > 3);

// Un evento manual parece duplicado de uno automático si es el mismo día y comparten
// la mayoría de las palabras del título más corto
function pareceDuplicado(manual: Evento, automatico: Evento) {
  if (manual.fecha !== automatico.fecha) return false;
  const [corto, largo] = [palabrasClave(manual.titulo), palabrasClave(automatico.titulo)].sort((a, b) => a.length - b.length);
  if (corto.length === 0) return false;
  const enComun = corto.filter((palabra) => largo.includes(palabra)).length;
  return enComun / corto.length >= 0.6;
}

// Categorías con que el Calendario muestra solo lo que viene de otras secciones (ver Calendario/eventos.ts)
const CATEGORIAS_AUTOMATICAS: Record<string, string> = {
  taller: 'Los talleres extraordinarios se muestran con esta categoría',
  festival: 'Los días del festival (horarios de la Cartelera) se muestran con esta categoría',
  convocatoria: 'Las fechas de cierre de las convocatorias se muestran con esta categoría',
};

export default function AdminCalendario() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [verPasados, setVerPasados] = useState(false);
  const [diaFiltro, setDiaFiltro] = useState(''); // '' = todos los días, o 'AAAA-MM-DD'
  const [categoriaFiltro, setCategoriaFiltro] = useState(''); // '' = todas, 'sin' = sin categoría, o el id
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<CategoriaCalendario[]>([]);
  const [editandoCategorias, setEditandoCategorias] = useState(false);
  const [automaticos, setAutomaticos] = useState<Evento[]>([]);

  useEffect(() => {
    cargarEventos();
    recargarCategorias();
    cargarAutomaticos();
  }, []);

  // Los mismos que ve el público en /calendario (talleres, días del festival, cierres de convocatoria)
  async function cargarAutomaticos() {
    const publicos = await cargarEventosPublicos('2000-01-01', '2100-12-31');
    setAutomaticos(publicos.flatMap((evento) => {
      const origen = origenDe(evento.id);
      if (!origen) return [];
      const { id, titulo, fecha, hora_inicio, hora_fin, lugar, descripcion, enlace_url } = evento;
      return [{ id, titulo, fecha, hora_inicio, hora_fin, lugar, descripcion, enlace_url, categoria_id: evento.categoria?.id ?? null, activo: true, origen }];
    }));
  }

  function recargarCategorias() {
    cargarCategorias().then(setCategorias);
  }

  const categoriaPorId = (id: string | null) => categorias.find((categoria) => categoria.id === id) ?? null;

  async function cargarEventos() {
    setCargando(true);
    setError(null);

    const { data, error: errorConsulta } = await supabase
      .from('eventos_calendario')
      .select('id, titulo, fecha, hora_inicio, hora_fin, lugar, categoria_id, descripcion, enlace_url, activo')
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true });

    if (errorConsulta) {
      setError('No se pudieron cargar los eventos.');
      console.error(errorConsulta);
    } else {
      setEventos((data || []) as Evento[]);
    }
    setCargando(false);
  }

  // Agrupa por mes: { '2026-10': [...] }
  // Con un día elegido se muestra ese día aunque ya haya pasado
  const eventosPorMes = useMemo(() => {
    const todos = [...eventos, ...automaticos]
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora_inicio || '').localeCompare(b.hora_inicio || ''));
    const visibles = todos.filter((evento) => {
      if (diaFiltro ? evento.fecha !== diaFiltro : !verPasados && evento.fecha < hoy()) return false;
      if (categoriaFiltro === 'sin') return !evento.categoria_id;
      return !categoriaFiltro || evento.categoria_id === categoriaFiltro;
    });
    return visibles.reduce<Record<string, Evento[]>>((grupos, evento) => {
      const mes = evento.fecha.slice(0, 7);
      (grupos[mes] ||= []).push(evento);
      return grupos;
    }, {});
  }, [eventos, automaticos, verPasados, diaFiltro, categoriaFiltro]);
  const hayFiltros = diaFiltro !== '' || categoriaFiltro !== '';

  // Eventos manuales que ya salen solos desde otra sección: id del manual → sección de donde viene
  const duplicados = useMemo(() => new Map(eventos.flatMap((manual) => {
    const automatico = automaticos.find((candidato) => pareceDuplicado(manual, candidato));
    return automatico?.origen ? [[manual.id, ORIGENES[automatico.origen].seccion] as const] : [];
  })), [eventos, automaticos]);

  function cerrarFormulario() {
    setEditandoId(null);
    setFormulario(formularioInicial);
    setFormularioAbierto(false);
  }

  function abrirNuevo() {
    setEditandoId(null);
    setFormulario(formularioInicial);
    setFormularioAbierto(true);
  }

  function abrirEdicion(evento: Evento) {
    setEditandoId(evento.id);
    setFormulario({
      titulo: evento.titulo,
      fecha: evento.fecha,
      hora_inicio: evento.hora_inicio?.slice(0, 5) || '',
      hora_fin: evento.hora_fin?.slice(0, 5) || '',
      lugar: evento.lugar || '',
      categoria_id: evento.categoria_id || '',
      descripcion: evento.descripcion || '',
      enlace_url: evento.enlace_url || '',
    });
    setFormularioAbierto(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function manejarCambio(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (formulario.hora_fin && formulario.hora_inicio && formulario.hora_fin <= formulario.hora_inicio) {
      toast.error('La hora de término debe ser después de la hora de inicio.');
      return;
    }

    setGuardando(true);
    const datos = {
      titulo: formulario.titulo.trim(),
      fecha: formulario.fecha,
      hora_inicio: formulario.hora_inicio || null,
      hora_fin: formulario.hora_fin || null,
      lugar: formulario.lugar.trim() || null,
      categoria_id: formulario.categoria_id || null,
      descripcion: formulario.descripcion.trim() || null,
      enlace_url: formulario.enlace_url.trim() || null,
    };

    const respuesta = editandoId
      ? await supabase.from('eventos_calendario').update(datos).eq('id', editandoId)
      : await supabase.from('eventos_calendario').insert({ ...datos, activo: true });

    setGuardando(false);
    if (respuesta.error) {
      console.error(respuesta.error);
      toast.error('No se pudo guardar el evento.');
      return;
    }

    toast.success(editandoId ? 'Evento actualizado.' : 'Evento agregado al calendario.');
    cerrarFormulario();
    await cargarEventos();
  }

  async function alternarEstado(evento: Evento) {
    const { error: errorActualizacion } = await supabase
      .from('eventos_calendario')
      .update({ activo: !evento.activo })
      .eq('id', evento.id);

    if (errorActualizacion) {
      toast.error('No se pudo cambiar el estado.');
      return;
    }
    setEventos((actuales) => actuales.map((item) => item.id === evento.id ? { ...item, activo: !item.activo } : item));
  }

  async function eliminar(evento: Evento) {
    if (!window.confirm(`¿Eliminar "${evento.titulo}"? Esta acción no se puede deshacer.`)) return;

    const { error: errorEliminacion } = await supabase.from('eventos_calendario').delete().eq('id', evento.id);
    if (errorEliminacion) {
      toast.error('No se pudo eliminar el evento.');
      return;
    }
    setEventos((actuales) => actuales.filter((item) => item.id !== evento.id));
    toast.success('Evento eliminado.');
  }

  const meses = Object.keys(eventosPorMes);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 border-b border-[#4A2E18]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendario</h1>
          <p className="mt-1 font-medium text-green-700">Actividades del equipo a lo largo del año. Los talleres extraordinarios aparecen solos.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditandoCategorias((actual) => !actual)} className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
            <Tags className="h-5 w-5" /> Categorías
          </button>
          <button onClick={abrirNuevo} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
            <Plus className="h-5 w-5" /> Nuevo evento
          </button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700"><AlertCircle className="h-5 w-5" />{error}</div>}

      {editandoCategorias && (
        <div className="relative">
          <button onClick={() => setEditandoCategorias(false)} className="absolute right-3 top-3 z-10 rounded-lg p-2 text-gray-500 hover:bg-gray-200" title="Cerrar"><X className="h-5 w-5" /></button>
          <EditorCatalogo
            // key: reinicia el editor con los datos recién guardados
            key={categorias.map((categoria) => `${categoria.id}${categoria.nombre}${categoria.color}`).join()}
            titulo="Categorías"
            descripcion="Aparecen en la leyenda del calendario con su color, en el orden de esta lista."
            tabla="calendario_categorias"
            items={categorias}
            maxLongitud={80}
            avisoEliminar="Los eventos que la usan quedarán sin categoría (en gris)."
            protegidos={Object.fromEntries(categorias
              .filter((categoria) => categoria.clave && CATEGORIAS_AUTOMATICAS[categoria.clave])
              .map((categoria) => [categoria.id, `${CATEGORIAS_AUTOMATICAS[categoria.clave!]}; puedes renombrarla o cambiar su color, pero no borrarla.`]))}
            onCambio={recargarCategorias}
          />
        </div>
      )}

      {formularioAbierto && (
        <Card className="border-transparent bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50 px-6 py-4">
            <CardTitle className="text-lg text-gray-800">{editandoId ? 'Editar evento' : 'Nuevo evento'}</CardTitle>
            <button onClick={cerrarFormulario} className="rounded-lg p-2 text-gray-500 hover:bg-gray-200" title="Cerrar formulario"><X className="h-5 w-5" /></button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={guardar} className="grid gap-5 md:grid-cols-2">
              <div className="space-y-5">
                <label className="block text-sm font-semibold text-gray-700">Título
                  <input name="titulo" value={formulario.titulo} onChange={manejarCambio} maxLength={150} placeholder="Jornada de reforestación" className={claseInput} required />
                </label>
                <label className="block text-sm font-semibold text-gray-700">Categoría
                  <select name="categoria_id" value={formulario.categoria_id} onChange={manejarCambio} className={`${claseInput} bg-white`} required>
                    <option value="" disabled>Elige una categoría</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setEditandoCategorias(true)} className="mt-1 text-xs font-semibold text-green-700 hover:underline">+ Agregar o editar categorías</button>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <label className="block text-sm font-semibold text-gray-700">Fecha
                    <input name="fecha" type="date" value={formulario.fecha} onChange={manejarCambio} className={claseInput} required />
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">Inicio
                    <input name="hora_inicio" type="time" value={formulario.hora_inicio} onChange={manejarCambio} className={claseInput} />
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">Término
                    <input name="hora_fin" type="time" value={formulario.hora_fin} onChange={manejarCambio} className={claseInput} />
                  </label>
                </div>
                <label className="block text-sm font-semibold text-gray-700">Lugar (Opcional)
                  <input name="lugar" value={formulario.lugar} onChange={manejarCambio} maxLength={200} className={claseInput} />
                </label>
              </div>
              <div className="space-y-5">
                <label className="block text-sm font-semibold text-gray-700">Descripción (Opcional)
                  <textarea name="descripcion" value={formulario.descripcion} onChange={manejarCambio} maxLength={300} rows={4} className={`${claseInput} resize-none`} />
                </label>
                <label className="block text-sm font-semibold text-gray-700">Enlace para más información (Opcional)
                  <input name="enlace_url" type="url" value={formulario.enlace_url} onChange={manejarCambio} placeholder="https://..." className={claseInput} />
                </label>
                <button type="submit" disabled={guardando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {guardando ? <><Loader2 className="h-5 w-5 animate-spin" /> Guardando...</> : <><Save className="h-5 w-5" /> Guardar evento</>}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-transparent bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50 px-6 py-4">
          <CardTitle className="text-lg text-gray-800">{verPasados ? 'Todos los eventos' : 'Próximos eventos'}</CardTitle>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={verPasados} onChange={(e) => setVerPasados(e.target.checked)} className="h-4 w-4 accent-green-600" />
            Ver pasados
          </label>
        </CardHeader>
        <div className="flex flex-col gap-3 border-b px-6 py-3 sm:flex-row sm:items-center">
          <input
            type="date"
            value={diaFiltro}
            onChange={(e) => setDiaFiltro(e.target.value)}
            aria-label="Filtrar por día"
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none sm:w-44"
          />
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            aria-label="Filtrar por categoría"
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none sm:w-56"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
            <option value="sin">Sin categoría</option>
          </select>
          {hayFiltros && (
            <button type="button" onClick={() => { setDiaFiltro(''); setCategoriaFiltro(''); }} className="text-sm font-medium text-green-700 hover:underline sm:ml-auto">
              Quitar filtros
            </button>
          )}
        </div>
        <CardContent className="p-0">
          {cargando ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
          ) : meses.length === 0 ? (
            <p className="p-8 text-center text-gray-600">
              {hayFiltros ? 'No hay eventos con esos filtros.' : 'No hay eventos próximos. Agrega uno con "Nuevo evento".'}
            </p>
          ) : (
            meses.map((mes) => (
              <section key={mes}>
                <h3 className="border-y bg-gray-50 px-6 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                  {new Date(`${mes}-15T12:00:00`).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                </h3>
                <ul className="divide-y divide-gray-100">
                  {eventosPorMes[mes].map((evento) => (
                    <li key={evento.id} className={`flex items-center gap-4 px-6 py-3 ${evento.activo ? '' : 'opacity-50'}`}>
                      <span className="h-3 w-3 shrink-0 rounded-full" style={estiloPunto(categoriaPorId(evento.categoria_id))} title={categoriaPorId(evento.categoria_id)?.nombre ?? 'Sin categoría'} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900">{evento.titulo}</p>
                        <p className="truncate text-sm text-gray-500">
                          {formatearFecha(evento.fecha)}{evento.hora_inicio ? ` · ${formatearHora(evento.hora_inicio)}` : ''}{evento.lugar ? ` · ${evento.lugar}` : ''}
                        </p>
                        {evento.origen && (
                          <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            Automático · viene de {ORIGENES[evento.origen].seccion}
                          </span>
                        )}
                        {duplicados.has(evento.id) && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800" title="Sale dos veces en el calendario público. Si es lo mismo, bórralo de aquí y edítalo solo en su sección.">
                            <AlertCircle className="h-3.5 w-3.5" /> Posible duplicado: ya está en {duplicados.get(evento.id)}
                          </span>
                        )}
                      </div>
                      {evento.origen ? (
                        // Se edita u oculta en su sección para que no quede distinto de su origen
                        <Link to={rutaOrigen({ ...evento, origen: evento.origen })} className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50" title={`Editar o quitar en ${ORIGENES[evento.origen].seccion}`}>
                          <span className="hidden sm:inline">Editar en {ORIGENES[evento.origen].seccion}</span>
                          <span className="sm:hidden">Editar</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      ) : (
                      <div className="flex gap-1">
                        <button onClick={() => abrirEdicion(evento)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-green-600" title="Editar"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => alternarEstado(evento)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-green-600" title={evento.activo ? 'Ocultar' : 'Mostrar'}>{evento.activo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                        <button onClick={() => eliminar(evento)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
