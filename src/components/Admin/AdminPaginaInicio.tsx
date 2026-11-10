import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertCircle, ChevronDown, ExternalLink, Loader2, Plus, Save, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type SeccionVisible =
  | 'mostrar_cartelera' | 'mostrar_talleres' | 'mostrar_calendario'
  | 'mostrar_convocatorias' | 'mostrar_publicaciones' | 'mostrar_aliados';

// Los interruptores de módulos cuyo SQL aún no se corre simplemente no llegan de la base y no se muestran
type PaginaInicio = {
  titulo: string;
  subtitulo: string;
  descripcion: string;
} & Partial<Record<SeccionVisible, boolean>>;

const SECCIONES: { campo: SeccionVisible; nombre: string; detalle: string }[] = [
  { campo: 'mostrar_cartelera', nombre: 'Cartelera del festival', detalle: 'Activa la edición del festival; al desactivarla, /cartelera muestra la agenda anual' },
  { campo: 'mostrar_talleres', nombre: 'Próximos talleres', detalle: 'Tarjetas de talleres extraordinarios con registro' },
  { campo: 'mostrar_calendario', nombre: 'Esta semana', detalle: 'Actividades de los próximos 7 días del calendario' },
  { campo: 'mostrar_convocatorias', nombre: 'Convocatorias', detalle: 'Tarjetas de convocatorias activas' },
  { campo: 'mostrar_publicaciones', nombre: 'Comunidad FDMA en Acción', detalle: 'Publicaciones de Facebook e Instagram' },
  { campo: 'mostrar_aliados', nombre: 'Aliados', detalle: 'Carrusel de aliados de la comunidad' },
];

const LIMITE_DESCRIPCION = 400;

const TEXTOS: { campo: 'titulo' | 'subtitulo' | 'descripcion'; nombre: string }[] = [
  { campo: 'titulo', nombre: 'Título' },
  { campo: 'subtitulo', nombre: 'Subtítulo' },
  { campo: 'descripcion', nombre: 'Descripción' },
];

type FdmaSeccion = { id: string; anio: number; titulo: string; descripcion: string; activo: boolean };
type FdmaActividad = { id: string; seccion_id: string; titulo: string; descripcion: string; fecha: string | null; imagenes: string[]; enlace_url: string | null };

// Lista legible de lo que cambió respecto a lo guardado, para confirmar antes de publicar
function describirCambios(original: PaginaInicio, actual: PaginaInicio) {
  const cambios: string[] = [];
  for (const { campo, nombre } of SECCIONES) {
    if (campo in actual && !!original[campo] !== !!actual[campo]) cambios.push(`${actual[campo] ? 'Mostrar' : 'Ocultar'} «${nombre}»`);
  }

  async function subirImagenActividad(id: string, archivo: File) {
    const extension = archivo.name.split('.').pop()?.toLowerCase() || 'jpg';
    const ruta = `actividades/${crypto.randomUUID()}.${extension}`;
    const { error: errorSubida } = await supabase.storage.from('fdma-media').upload(ruta, archivo, { contentType: archivo.type, upsert: false });
    if (errorSubida) { toast.error(`No se pudo subir la imagen: ${errorSubida.message}`); return; }
    const url = supabase.storage.from('fdma-media').getPublicUrl(ruta).data.publicUrl;
    setFdmaActividades((actuales) => actuales.map((item) => item.id === id ? { ...item, imagenes: [url] } : item));
    toast.success('Imagen cargada. Pulsa Guardar para publicar el cambio.');
  }
  for (const { campo, nombre } of TEXTOS) {
    if (original[campo].trim() !== actual[campo].trim()) cambios.push(`Cambiar ${nombre.toLowerCase()}`);
  }
  return cambios;
}

export default function AdminPaginaInicio() {
  const [pagina, setPagina] = useState<PaginaInicio | null>(null);
  const [original, setOriginal] = useState<PaginaInicio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fdmaSecciones, setFdmaSecciones] = useState<FdmaSeccion[]>([]);
  const [fdmaActividades, setFdmaActividades] = useState<FdmaActividad[]>([]);
  const [fdmaForm, setFdmaForm] = useState({ anio: new Date().getFullYear(), titulo: '', descripcion: '', activo: true });
  const [actividadForm, setActividadForm] = useState({ titulo: '', descripcion: '', fecha: '', imagen: '', archivo: null as File | null, enlace_url: '' });
  const [fdmaSeleccionada, setFdmaSeleccionada] = useState<string | null>(null);
  const [seccionesAbiertas, setSeccionesAbiertas] = useState(true);

  useEffect(() => {
    const cargarPagina = async () => {
      const { data, error: errorConsulta } = await supabase
        .from('pagina_inicio')
        .select('*')
        .eq('id', 1)
        .single();

      if (errorConsulta) {
        setError('No se pudo cargar la configuración de la página.');
        console.error(errorConsulta);
      } else {
        setPagina(data as PaginaInicio);
        setOriginal(data as PaginaInicio);
      }
      setCargando(false);
    };

    cargarPagina();
    void cargarFdma();
  }, []);

  async function cargarFdma() {
    const { data: secciones } = await supabase.from('fdma_secciones').select('id, anio, titulo, descripcion, activo').order('anio', { ascending: false });
    const lista = (secciones || []) as FdmaSeccion[];
    setFdmaSecciones(lista);
    if (lista[0]) {
      setFdmaSeleccionada(lista[0].id);
      setFdmaForm({ anio: lista[0].anio, titulo: lista[0].titulo, descripcion: lista[0].descripcion, activo: lista[0].activo });
      const { data: actividades } = await supabase.from('fdma_actividades').select('*').eq('seccion_id', lista[0].id).order('orden');
      setFdmaActividades((actividades || []) as FdmaActividad[]);
    }
  }

  async function guardarFdmaSeccion() {
    const payload = { anio: Number(fdmaForm.anio), titulo: fdmaForm.titulo.trim() || `FDMA ${fdmaForm.anio}`, descripcion: fdmaForm.descripcion.trim(), activo: fdmaForm.activo };
    const resultado = fdmaSeleccionada
      ? await supabase.from('fdma_secciones').update(payload).eq('id', fdmaSeleccionada).select().single()
      : await supabase.from('fdma_secciones').insert(payload).select().single();
    if (resultado.error) { toast.error(`No se pudo guardar FDMA: ${resultado.error.message}`); return; }
    toast.success('Edición FDMA guardada.');
    await cargarFdma();
  }

  async function seleccionarFdma(seccion: FdmaSeccion) {
    setFdmaSeleccionada(seccion.id);
    setFdmaForm({ anio: seccion.anio, titulo: seccion.titulo, descripcion: seccion.descripcion, activo: seccion.activo });
    const { data } = await supabase.from('fdma_actividades').select('*').eq('seccion_id', seccion.id).order('orden');
    setFdmaActividades((data || []) as FdmaActividad[]);
  }

  async function guardarActividad(actividad: FdmaActividad) {
    const { error: errorActividad } = await supabase.from('fdma_actividades').update({
      titulo: actividad.titulo.trim(), descripcion: actividad.descripcion.trim(), fecha: actividad.fecha || null,
      imagenes: actividad.imagenes, enlace_url: actividad.enlace_url?.trim() || null,
    }).eq('id', actividad.id);
    if (errorActividad) toast.error(`No se pudo actualizar: ${errorActividad.message}`);
    else toast.success('Actividad actualizada.');
  }

  async function eliminarActividad(id: string) {
    if (!window.confirm('¿Eliminar esta actividad?')) return;
    const { error: errorActividad } = await supabase.from('fdma_actividades').delete().eq('id', id);
    if (errorActividad) toast.error(`No se pudo eliminar: ${errorActividad.message}`);
    else { setFdmaActividades((actuales) => actuales.filter((actividad) => actividad.id !== id)); toast.success('Actividad eliminada.'); }
  }

  async function agregarActividad() {
    if (!fdmaSeleccionada || !actividadForm.titulo.trim()) { toast.error('Selecciona una edición y escribe el título de la actividad.'); return; }
    let imagen = actividadForm.imagen.trim();
    if (actividadForm.archivo) {
      const extension = actividadForm.archivo.name.split('.').pop()?.toLowerCase() || 'jpg';
      const ruta = `actividades/${crypto.randomUUID()}.${extension}`;
      const { error: errorSubida } = await supabase.storage.from('fdma-media').upload(ruta, actividadForm.archivo, { contentType: actividadForm.archivo.type, upsert: false });
      if (errorSubida) { toast.error(`No se pudo subir la imagen: ${errorSubida.message}`); return; }
      imagen = supabase.storage.from('fdma-media').getPublicUrl(ruta).data.publicUrl;
    }
    const { error: errorActividad } = await supabase.from('fdma_actividades').insert({
      seccion_id: fdmaSeleccionada, titulo: actividadForm.titulo.trim(), descripcion: actividadForm.descripcion.trim(),
      fecha: actividadForm.fecha || null, imagenes: imagen ? [imagen] : [], enlace_url: actividadForm.enlace_url.trim() || null,
    });
    if (errorActividad) { toast.error(`No se pudo agregar la actividad: ${errorActividad.message}`); return; }
    toast.success('Actividad agregada.');
    setActividadForm({ titulo: '', descripcion: '', fecha: '', imagen: '', archivo: null, enlace_url: '' });
    await cargarFdma();
  }

  function manejarCambio(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setPagina((actual) => actual && { ...actual, [name]: value });
  }

  function alternarSeccion(campo: SeccionVisible) {
    setPagina((actual) => actual && { ...actual, [campo]: !actual[campo] });
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!pagina || !original) return;
    if (!pagina.titulo.trim() || !pagina.descripcion.trim()) {
      toast.error('Completa el título y la descripción.');
      return;
    }
    const cambios = describirCambios(original, pagina);
    if (cambios.length === 0) return;
    // Los cambios se publican al instante en la página pública
    if (!window.confirm(`Estos cambios se verán de inmediato en la página pública:\n\n• ${cambios.join('\n• ')}\n\n¿Publicarlos?`)) return;

    setGuardando(true);
    // Solo los interruptores existentes; los ajustes de la cartelera se guardan en su propio panel
    const interruptores = Object.fromEntries(
      SECCIONES.filter(({ campo }) => campo in pagina).map(({ campo }) => [campo, pagina[campo]]),
    );
    const { error: errorGuardado } = await supabase
      .from('pagina_inicio')
      .update({
        ...interruptores,
        titulo: pagina.titulo.trim(),
        subtitulo: pagina.subtitulo.trim(),
        descripcion: pagina.descripcion.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (errorGuardado) {
      console.error(errorGuardado);
      toast.error('No se pudieron guardar los cambios.');
    } else {
      toast.success('Página de inicio actualizada.');
      setOriginal(pagina);
    }
    setGuardando(false);
  }

  if (cargando) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>;
  }

  if (!pagina) {
    return <div className="mx-auto flex max-w-4xl items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700"><AlertCircle className="h-5 w-5" />{error}</div>;
  }

  const cambios = original ? describirCambios(original, pagina) : [];
  const hayCambios = cambios.length > 0;

  return (
    <form onSubmit={guardar} className="mx-auto max-w-4xl space-y-8 py-2 sm:py-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 border-b border-[#4A2E18]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Página de inicio</h1>
          <p className="mt-1 font-medium text-green-700">Textos y secciones de la página pública del festival</p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
          <ExternalLink className="h-4 w-4" /> Ver página
        </a>
      </div>

      <Card className="border-transparent bg-white shadow-sm">
        <CardHeader className="border-b bg-gray-50/50 p-0">
          <button
            type="button"
            onClick={() => setSeccionesAbiertas((abierta) => !abierta)}
            aria-expanded={seccionesAbiertas}
            className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-gray-100/70"
          >
            <CardTitle className="text-lg text-gray-800">Secciones visibles</CardTitle>
            <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${seccionesAbiertas ? 'rotate-180' : ''}`} />
          </button>
        </CardHeader>
        {seccionesAbiertas && (
          <CardContent className="divide-y divide-gray-100 p-0">
            {SECCIONES.filter(({ campo }) => campo in pagina).map(({ campo, nombre, detalle }) => (
              <div key={campo} className="flex items-center justify-between gap-4 px-6 py-4">
                <div>
                  <p className="font-semibold text-gray-900">{nombre}</p>
                  <p className="text-sm text-gray-500">{detalle}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!pagina[campo]}
                  aria-label={`Mostrar ${nombre}`}
                  onClick={() => alternarSeccion(campo)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${pagina[campo] ? 'bg-green-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${pagina[campo] ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      <Card className="border-transparent bg-white shadow-sm">
        <CardHeader className="border-b bg-gray-50/50 px-6 py-4">
          <CardTitle className="text-lg text-gray-800">Ediciones FDMA</CardTitle>
          <p className="text-sm text-gray-500">Crea FDMA 2024, 2025, 2026 o cualquier edición futura y agrega sus actividades.</p>
        </CardHeader>
        <CardContent className="space-y-5 px-6 py-5">
          <div className="flex flex-wrap gap-2">
            {fdmaSecciones.map((seccion) => (
              <button type="button" key={seccion.id} onClick={() => void seleccionarFdma(seccion)} className={`rounded-full px-4 py-2 text-sm font-bold ${fdmaSeleccionada === seccion.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>FDMA {seccion.anio}</button>
            ))}
            <button type="button" onClick={() => { setFdmaSeleccionada(null); setFdmaForm({ anio: new Date().getFullYear(), titulo: '', descripcion: '', activo: true }); setFdmaActividades([]); }} className="rounded-full border border-dashed border-green-600 px-4 py-2 text-sm font-bold text-green-700"><Plus className="mr-1 inline h-4 w-4" /> Nueva edición</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-gray-700">Año<input type="number" value={fdmaForm.anio} onChange={(e) => setFdmaForm({ ...fdmaForm, anio: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
            <label className="text-sm font-semibold text-gray-700">Título<input value={fdmaForm.titulo} onChange={(e) => setFdmaForm({ ...fdmaForm, titulo: e.target.value })} placeholder={`FDMA ${fdmaForm.anio}`} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
          </div>
          <label className="block text-sm font-semibold text-gray-700">Descripción<textarea value={fdmaForm.descripcion} onChange={(e) => setFdmaForm({ ...fdmaForm, descripcion: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700"><input type="checkbox" checked={fdmaForm.activo} onChange={(e) => setFdmaForm({ ...fdmaForm, activo: e.target.checked })} className="h-4 w-4 accent-green-600" /> Mostrar esta edición en la página pública</label>
          <button type="button" onClick={() => void guardarFdmaSeccion()} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700">Guardar edición</button>
          {fdmaSeleccionada && <div className="space-y-3 border-t pt-4">
            <h3 className="font-bold text-gray-800">Actividades ({fdmaActividades.length})</h3>
            {fdmaActividades.map((actividad) => <div key={actividad.id} className="space-y-2 rounded-lg bg-gray-50 p-3">
              <div className="grid gap-2 md:grid-cols-2">
                <input value={actividad.titulo} onChange={(e) => setFdmaActividades((actuales) => actuales.map((item) => item.id === actividad.id ? { ...item, titulo: e.target.value } : item))} className="rounded-lg border px-3 py-2 text-sm" />
                <input type="date" value={actividad.fecha || ''} onChange={(e) => setFdmaActividades((actuales) => actuales.map((item) => item.id === actividad.id ? { ...item, fecha: e.target.value || null } : item))} className="rounded-lg border px-3 py-2 text-sm" />
                <input value={actividad.imagenes[0] || ''} onChange={(e) => setFdmaActividades((actuales) => actuales.map((item) => item.id === actividad.id ? { ...item, imagenes: e.target.value ? [e.target.value] : [] } : item))} placeholder="URL de imagen" className="rounded-lg border px-3 py-2 text-sm" />
                <input type="file" accept="image/*" onChange={(e) => { const archivo = e.target.files?.[0]; if (archivo) void subirImagenActividad(actividad.id, archivo); }} className="rounded-lg border bg-white px-3 py-2 text-sm" />
                <input value={actividad.enlace_url || ''} onChange={(e) => setFdmaActividades((actuales) => actuales.map((item) => item.id === actividad.id ? { ...item, enlace_url: e.target.value } : item))} placeholder="URL opcional" className="rounded-lg border px-3 py-2 text-sm" />
              </div>
              <textarea value={actividad.descripcion} onChange={(e) => setFdmaActividades((actuales) => actuales.map((item) => item.id === actividad.id ? { ...item, descripcion: e.target.value } : item))} rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <button type="button" onClick={() => void guardarActividad(actividad)} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white"><Save className="mr-1 inline h-3.5 w-3.5" /> Guardar</button>
                <button type="button" onClick={() => void eliminarActividad(actividad.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600"><Trash2 className="mr-1 inline h-3.5 w-3.5" /> Eliminar</button>
              </div>
            </div>)}
            <div className="grid gap-3 md:grid-cols-2">
              <input value={actividadForm.titulo} onChange={(e) => setActividadForm({ ...actividadForm, titulo: e.target.value })} placeholder="Título de actividad" className="rounded-lg border px-3 py-2" />
              <input type="date" value={actividadForm.fecha} onChange={(e) => setActividadForm({ ...actividadForm, fecha: e.target.value })} className="rounded-lg border px-3 py-2" />
              <input value={actividadForm.imagen} onChange={(e) => setActividadForm({ ...actividadForm, imagen: e.target.value })} placeholder="URL de imagen (opcional)" className="rounded-lg border px-3 py-2" />
              <input type="file" accept="image/*" onChange={(e) => setActividadForm({ ...actividadForm, archivo: e.target.files?.[0] || null })} className="rounded-lg border bg-white px-3 py-2" />
              <input value={actividadForm.enlace_url} onChange={(e) => setActividadForm({ ...actividadForm, enlace_url: e.target.value })} placeholder="URL opcional" className="rounded-lg border px-3 py-2" />
            </div>
            <textarea value={actividadForm.descripcion} onChange={(e) => setActividadForm({ ...actividadForm, descripcion: e.target.value })} placeholder="Descripción de la actividad" rows={2} className="w-full rounded-lg border px-3 py-2" />
            <button type="button" onClick={() => void agregarActividad()} className="rounded-lg border border-green-600 px-4 py-2 text-sm font-bold text-green-700"><Plus className="mr-1 inline h-4 w-4" /> Agregar actividad</button>
          </div>}
        </CardContent>
      </Card>

      {/* Plegado: se edita poco y un cambio accidental se ve en la portada */}
      <details className="group rounded-xl bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-6 py-4 hover:bg-gray-50">
          <span>
            <span className="block text-lg font-semibold text-gray-800">Textos de la portada</span>
            <span className="block text-sm text-gray-500">Título, subtítulo y descripción. Normalmente no hace falta cambiarlos.</span>
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-5 border-t px-6 pb-6 pt-5">
          <label className="block text-sm font-semibold text-gray-700">Título
            <input name="titulo" value={pagina.titulo} onChange={manejarCambio} maxLength={80} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" />
          </label>
          <label className="block text-sm font-semibold text-gray-700">Subtítulo (en verde)
            <input name="subtitulo" value={pagina.subtitulo} onChange={manejarCambio} maxLength={80} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" />
          </label>
          <label className="block text-sm font-semibold text-gray-700">Descripción
            <textarea name="descripcion" value={pagina.descripcion} onChange={manejarCambio} maxLength={LIMITE_DESCRIPCION} rows={4} className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" />
            <span className={`mt-1 block text-right text-xs font-medium ${pagina.descripcion.length >= LIMITE_DESCRIPCION ? 'text-red-600' : 'text-gray-500'}`}>
              {pagina.descripcion.length} / {LIMITE_DESCRIPCION} caracteres permitidos
            </span>
          </label>
        </div>
      </details>

      {/* Barra fija mientras haya cambios sin publicar */}
      <div className={`sticky bottom-4 flex flex-col gap-3 rounded-2xl border p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between ${hayCambios ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'}`}>
        <p className={`text-sm font-medium ${hayCambios ? 'text-amber-800' : 'text-gray-500'}`}>
          {hayCambios ? `Cambios sin publicar: ${cambios.join(', ')}` : 'Sin cambios pendientes. Lo que ves es lo que está publicado.'}
        </p>
        <div className="flex shrink-0 gap-2">
          {hayCambios && (
            <button type="button" onClick={() => setPagina(original)} disabled={guardando} className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <Undo2 className="h-4 w-4" /> Descartar
            </button>
          )}
          <button type="submit" disabled={guardando || !hayCambios} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
            {guardando ? <><Loader2 className="h-4 w-4 animate-spin" /> Publicando...</> : <><Save className="h-4 w-4" /> Publicar cambios</>}
          </button>
        </div>
      </div>
    </form>
  );
}
