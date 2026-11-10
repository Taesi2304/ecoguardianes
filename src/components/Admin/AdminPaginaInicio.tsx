import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertCircle, ChevronDown, ExternalLink, Loader2, Plus, Save, Trash2, Undo2, X } from 'lucide-react';
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

type FdmaSeccion = { id: string; anio: number; titulo: string; subtitulo: string; descripcion: string; activo: boolean };
type FdmaGanador = { lugar: number; proyecto: string; participantes: string; asesor: string; organizacion: string; contacto: string; descripcion: string; imagen: string };
type FdmaActividad = { id: string; seccion_id: string; titulo: string; subtitulo: string; descripcion: string; fecha: string | null; imagenes: string[]; videos: string[]; pdfs: string[]; ganadores: FdmaGanador[]; enlace_url: string | null };

// Lista legible de lo que cambió respecto a lo guardado, para confirmar antes de publicar
function describirCambios(original: PaginaInicio, actual: PaginaInicio) {
  const cambios: string[] = [];
  for (const { campo, nombre } of SECCIONES) {
    if (campo in actual && !!original[campo] !== !!actual[campo]) cambios.push(`${actual[campo] ? 'Mostrar' : 'Ocultar'} «${nombre}»`);
  }

  function actualizarGanador(id: string, indice: number, campo: keyof FdmaGanador, valor: string) {
    setFdmaActividades((actuales) => actuales.map((actividad) => actividad.id === id
      ? { ...actividad, ganadores: actividad.ganadores.map((ganador, posicion) => posicion === indice ? { ...ganador, [campo]: valor } : ganador) }
      : actividad));
  }

  function agregarGanadores(id: string) {
    setFdmaActividades((actuales) => actuales.map((actividad) => actividad.id === id ? { ...actividad, ganadores: crearGanadores() } : actividad));
  }

  async function subirImagenGanador(id: string, indice: number, archivo: File) {
    const extension = archivo.name.split('.').pop()?.toLowerCase() || 'jpg';
    const ruta = `ganadores/${crypto.randomUUID()}.${extension}`;
    const { error: errorSubida } = await supabase.storage.from('fdma-media').upload(ruta, archivo, { contentType: archivo.type, upsert: false });
    if (errorSubida) { toast.error(`No se pudo subir la imagen: ${errorSubida.message}`); return; }
    actualizarGanador(id, indice, 'imagen', supabase.storage.from('fdma-media').getPublicUrl(ruta).data.publicUrl);
    toast.success('Imagen del lugar cargada. Pulsa Guardar.');
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
  const [fdmaForm, setFdmaForm] = useState({ anio: new Date().getFullYear(), titulo: '', subtitulo: '', descripcion: '', activo: true });
  const [actividadForm, setActividadForm] = useState({ titulo: '', subtitulo: '', descripcion: '', fecha: '', imagenes: '', archivos: [] as File[], videos: '', pdfs: '', pdfArchivos: [] as File[], ganadores: false, enlace_url: '' });
  const [fdmaSeleccionada, setFdmaSeleccionada] = useState<string | null>(null);
  const [seccionesAbiertas, setSeccionesAbiertas] = useState(true);
  const [fdmaAbierta, setFdmaAbierta] = useState(true);
  const archivosVista = useMemo(() => actividadForm.archivos.map((archivo) => ({ archivo, url: URL.createObjectURL(archivo) })), [actividadForm.archivos]);

  useEffect(() => () => archivosVista.forEach(({ url }) => URL.revokeObjectURL(url)), [archivosVista]);

  async function subirImagenActividad(id: string, archivo: File) {
    const extension = archivo.name.split('.').pop()?.toLowerCase() || 'jpg';
    const ruta = `actividades/${crypto.randomUUID()}.${extension}`;
    const { error: errorSubida } = await supabase.storage.from('fdma-media').upload(ruta, archivo, { contentType: archivo.type, upsert: false });
    if (errorSubida) { toast.error(`No se pudo subir el archivo: ${errorSubida.message}`); return; }
    const url = supabase.storage.from('fdma-media').getPublicUrl(ruta).data.publicUrl;
    setFdmaActividades((actuales) => actuales.map((item) => item.id === id
      ? archivo.type === 'application/pdf'
        ? { ...item, pdfs: [...item.pdfs, url] }
        : archivo.type.startsWith('video/')
          ? { ...item, videos: [...item.videos, url] }
          : { ...item, imagenes: [...item.imagenes, url] }
      : item));
    toast.success('Archivo cargado. Pulsa Guardar para publicar el cambio.');
  }

  async function quitarMediaActividad(id: string, tipo: 'imagenes' | 'videos' | 'pdfs', indice: number) {
    const actividad = fdmaActividades.find((item) => item.id === id);
    if (!actividad) return;
    const url = actividad[tipo][indice];
    const marcador = '/storage/v1/object/public/fdma-media/';
    const posicion = url.indexOf(marcador);
    if (posicion >= 0) await supabase.storage.from('fdma-media').remove([decodeURIComponent(url.slice(posicion + marcador.length))]);
    setFdmaActividades((actuales) => actuales.map((item) => item.id === id ? { ...item, [tipo]: item[tipo].filter((_, actual) => actual !== indice) } : item));
    toast.success('Elemento quitado. Pulsa Guardar para confirmar.');
  }

  async function eliminarFdmaSeccion() {
    if (!fdmaSeleccionada || !window.confirm('Se eliminará esta edición y todas sus actividades. ¿Continuar?')) return;
    const { error: errorEliminacion } = await supabase.from('fdma_secciones').delete().eq('id', fdmaSeleccionada);
    if (errorEliminacion) { toast.error(`No se pudo eliminar la edición: ${errorEliminacion.message}`); return; }
    toast.success('Edición eliminada.');
    setFdmaSeleccionada(null);
    setFdmaActividades([]);
    await cargarFdma();
  }

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
    const { data: secciones } = await supabase.from('fdma_secciones').select('id, anio, titulo, subtitulo, descripcion, activo').order('anio', { ascending: false });
    const lista = (secciones || []) as FdmaSeccion[];
    setFdmaSecciones(lista);
    if (lista[0]) {
      setFdmaSeleccionada(lista[0].id);
      setFdmaForm({ anio: lista[0].anio, titulo: lista[0].titulo, subtitulo: lista[0].subtitulo || '', descripcion: lista[0].descripcion, activo: lista[0].activo });
      const { data: actividades } = await supabase.from('fdma_actividades').select('*').eq('seccion_id', lista[0].id).order('orden');
      setFdmaActividades((actividades || []) as FdmaActividad[]);
    }
  }

  async function guardarFdmaSeccion() {
    const payload = { anio: Number(fdmaForm.anio), titulo: fdmaForm.titulo.trim() || `FDMA ${fdmaForm.anio}`, subtitulo: fdmaForm.subtitulo.trim(), descripcion: fdmaForm.descripcion.trim(), activo: fdmaForm.activo };
    const resultado = fdmaSeleccionada
      ? await supabase.from('fdma_secciones').update(payload).eq('id', fdmaSeleccionada).select().single()
      : await supabase.from('fdma_secciones').insert(payload).select().single();
    if (resultado.error) { toast.error(`No se pudo guardar FDMA: ${resultado.error.message}`); return; }
    toast.success('Edición FDMA guardada.');
    await cargarFdma();
  }

  async function seleccionarFdma(seccion: FdmaSeccion) {
    setFdmaSeleccionada(seccion.id);
    setFdmaForm({ anio: seccion.anio, titulo: seccion.titulo, subtitulo: seccion.subtitulo || '', descripcion: seccion.descripcion, activo: seccion.activo });
    const { data } = await supabase.from('fdma_actividades').select('*').eq('seccion_id', seccion.id).order('orden');
    setFdmaActividades((data || []) as FdmaActividad[]);
  }

  async function guardarActividad(actividad: FdmaActividad) {
    const { error: errorActividad } = await supabase.from('fdma_actividades').update({
      titulo: actividad.titulo.trim(), subtitulo: actividad.subtitulo.trim(), descripcion: actividad.descripcion.trim(), fecha: actividad.fecha || null,
      imagenes: actividad.imagenes, videos: actividad.videos, pdfs: actividad.pdfs, ganadores: actividad.ganadores, enlace_url: actividad.enlace_url?.trim() || null,
    }).eq('id', actividad.id);
    if (errorActividad) toast.error(`No se pudo actualizar: ${errorActividad.message}`);
    else {
      toast.success('Actividad actualizada.');
      await seleccionarFdma(fdmaSecciones.find((seccion) => seccion.id === fdmaSeleccionada) || { id: fdmaSeleccionada!, anio: 0, titulo: '', subtitulo: '', descripcion: '', activo: true });
    }
  }

  function crearGanadores() {
    return [1, 2, 3].map((lugar) => ({ lugar, proyecto: '', participantes: '', asesor: '', organizacion: '', contacto: '', descripcion: '', imagen: '' }));
  }

  async function eliminarActividad(id: string) {
    if (!window.confirm('¿Eliminar esta actividad?')) return;
    const { error: errorActividad } = await supabase.from('fdma_actividades').delete().eq('id', id);
    if (errorActividad) toast.error(`No se pudo eliminar: ${errorActividad.message}`);
    else { setFdmaActividades((actuales) => actuales.filter((actividad) => actividad.id !== id)); toast.success('Actividad eliminada.'); }
  }

  async function agregarActividad() {
    if (!fdmaSeleccionada || !actividadForm.titulo.trim()) { toast.error('Selecciona una edición y escribe el título de la actividad.'); return; }
    const imagenes = actividadForm.imagenes.split('\n').map((url) => url.trim()).filter(Boolean);
    const videos = actividadForm.videos.split('\n').map((url) => url.trim()).filter(Boolean);
    const pdfs = actividadForm.pdfs.split('\n').map((url) => url.trim()).filter(Boolean);
    for (const archivo of actividadForm.archivos) {
      const extension = archivo.name.split('.').pop()?.toLowerCase() || 'jpg';
      const ruta = `actividades/${crypto.randomUUID()}.${extension}`;
      const { error: errorSubida } = await supabase.storage.from('fdma-media').upload(ruta, archivo, { contentType: archivo.type, upsert: false });
      if (errorSubida) { toast.error(`No se pudo subir ${archivo.name}: ${errorSubida.message}`); return; }
      const url = supabase.storage.from('fdma-media').getPublicUrl(ruta).data.publicUrl;
      if (archivo.type.startsWith('video/')) videos.push(url);
      else imagenes.push(url);
    }
    for (const archivo of actividadForm.pdfArchivos) {
      const ruta = `documentos/${crypto.randomUUID()}.pdf`;
      const { error: errorSubida } = await supabase.storage.from('fdma-media').upload(ruta, archivo, { contentType: 'application/pdf', upsert: false });
      if (errorSubida) { toast.error(`No se pudo subir ${archivo.name}: ${errorSubida.message}`); return; }
      pdfs.push(supabase.storage.from('fdma-media').getPublicUrl(ruta).data.publicUrl);
    }
    const { error: errorActividad } = await supabase.from('fdma_actividades').insert({
      seccion_id: fdmaSeleccionada, titulo: actividadForm.titulo.trim(), subtitulo: actividadForm.subtitulo.trim(), descripcion: actividadForm.descripcion.trim(),
      fecha: actividadForm.fecha || null, imagenes, videos, pdfs, ganadores: actividadForm.ganadores ? crearGanadores() : [], enlace_url: actividadForm.enlace_url.trim() || null,
    });
    if (errorActividad) { toast.error(`No se pudo agregar la actividad: ${errorActividad.message}`); return; }
    toast.success('Actividad agregada.');
    setActividadForm({ titulo: '', subtitulo: '', descripcion: '', fecha: '', imagenes: '', archivos: [], videos: '', pdfs: '', pdfArchivos: [], ganadores: false, enlace_url: '' });
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
        <CardHeader className="border-b bg-gray-50/50 p-0">
          <button type="button" onClick={() => setFdmaAbierta((abierta) => !abierta)} aria-expanded={fdmaAbierta} className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-gray-100/70">
            <span><CardTitle className="text-lg text-gray-800">Ediciones FDMA</CardTitle><span className="mt-1 block text-sm font-normal text-gray-500">Crea FDMA 2024, 2025, 2026 o cualquier edición futura y administra sus carretes.</span></span>
            <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${fdmaAbierta ? 'rotate-180' : ''}`} />
          </button>
        </CardHeader>
        {fdmaAbierta && <CardContent className="space-y-5 px-6 py-5">
          <div className="flex flex-wrap gap-2">
            {fdmaSecciones.map((seccion) => (
              <button type="button" key={seccion.id} onClick={() => void seleccionarFdma(seccion)} className={`rounded-full px-4 py-2 text-sm font-bold ${fdmaSeleccionada === seccion.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>FDMA {seccion.anio}</button>
            ))}
            <button type="button" onClick={() => { setFdmaSeleccionada(null); setFdmaForm({ anio: new Date().getFullYear(), titulo: '', subtitulo: '', descripcion: '', activo: true }); setFdmaActividades([]); }} className="rounded-full border border-dashed border-green-600 px-4 py-2 text-sm font-bold text-green-700"><Plus className="mr-1 inline h-4 w-4" /> Nueva edición</button>
          </div>
          {fdmaSeleccionada && <p className="text-sm text-gray-500">Estás editando <strong>FDMA {fdmaForm.anio}</strong>. Si fue un error, puedes eliminarla desde el botón rojo al guardar.</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-gray-700">Año<input type="number" value={fdmaForm.anio} onChange={(e) => setFdmaForm({ ...fdmaForm, anio: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
            <label className="text-sm font-semibold text-gray-700">Título de la edición<input value={fdmaForm.titulo} onChange={(e) => setFdmaForm({ ...fdmaForm, titulo: e.target.value })} placeholder={`FDMA ${fdmaForm.anio}`} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
          </div>
          <label className="block text-sm font-semibold text-gray-700">Subtítulo de la edición<input value={fdmaForm.subtitulo} onChange={(e) => setFdmaForm({ ...fdmaForm, subtitulo: e.target.value })} placeholder="Ej. Actividades, encuentros y comunidad" className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
          <label className="block text-sm font-semibold text-gray-700">Descripción general de la edición<textarea value={fdmaForm.descripcion} onChange={(e) => setFdmaForm({ ...fdmaForm, descripcion: e.target.value })} placeholder="Explica de qué trata esta edición." rows={2} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700"><input type="checkbox" checked={fdmaForm.activo} onChange={(e) => setFdmaForm({ ...fdmaForm, activo: e.target.checked })} className="h-4 w-4 accent-green-600" /> Mostrar esta edición en la página pública</label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void guardarFdmaSeccion()} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700">Guardar edición</button>
            {fdmaSeleccionada && <button type="button" onClick={() => void eliminarFdmaSeccion()} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"><Trash2 className="mr-1 inline h-4 w-4" /> Eliminar edición</button>}
          </div>
          {fdmaSeleccionada && <div className="space-y-4 border-t pt-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div><h3 className="text-xl font-bold text-gray-800">Actividades de esta edición</h3><p className="text-sm text-gray-500">Cada actividad funciona como una tarjeta independiente. Ábrela para editar su contenido.</p></div>
              <span className="text-sm font-semibold text-green-700">{fdmaActividades.length} actividad{fdmaActividades.length === 1 ? '' : 'es'}</span>
            </div>
            {fdmaActividades.map((actividad) => <details key={actividad.id} className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 hover:bg-gray-50">
                <span className="min-w-0"><span className="block truncate font-bold text-gray-800">{actividad.titulo || 'Actividad sin título'}</span><span className="mt-1 block truncate text-sm text-gray-500">{actividad.subtitulo || actividad.fecha || 'Sin subtítulo'} · {actividad.imagenes.length} foto(s), {actividad.videos.length} video(s), {actividad.pdfs.length} PDF</span></span>
                <ChevronDown className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-3 border-t bg-gray-50/60 p-4">
              <div className="grid gap-2 md:grid-cols-2">
                <input value={actividad.titulo} onChange={(e) => setFdmaActividades((actuales) => actuales.map((item) => item.id === actividad.id ? { ...item, titulo: e.target.value } : item))} placeholder="Título de la actividad" className="rounded-lg border px-3 py-2 text-sm" />
                <input value={actividad.subtitulo} onChange={(e) => setFdmaActividades((actuales) => actuales.map((item) => item.id === actividad.id ? { ...item, subtitulo: e.target.value } : item))} placeholder="Subtítulo: fecha o frase breve" className="rounded-lg border px-3 py-2 text-sm" />
                <input type="date" value={actividad.fecha || ''} onChange={(e) => setFdmaActividades((actuales) => actuales.map((item) => item.id === actividad.id ? { ...item, fecha: e.target.value || null } : item))} className="rounded-lg border px-3 py-2 text-sm" />
              </div>
              <textarea value={actividad.descripcion} onChange={(e) => setFdmaActividades((actuales) => actuales.map((item) => item.id === actividad.id ? { ...item, descripcion: e.target.value } : item))} rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" />
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-xl border border-green-100 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div><p className="text-sm font-bold text-gray-800">Fotos</p><p className="text-xs text-gray-500">Imágenes del carrete</p></div>
                    <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-700">{actividad.imagenes.length}</span>
                  </div>
                  <label className="mt-3 block cursor-pointer rounded-lg border border-dashed border-green-300 bg-green-50/50 p-3 text-center text-xs font-semibold text-green-800 hover:bg-green-50">
                    + Agregar fotos
                    <input type="file" accept="image/*" multiple onChange={(e) => Array.from(e.target.files || []).forEach((archivo) => void subirImagenActividad(actividad.id, archivo))} className="sr-only" />
                  </label>
                </div>
                <div className="rounded-xl border border-blue-100 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div><p className="text-sm font-bold text-gray-800">Videos</p><p className="text-xs text-gray-500">Videos de la actividad</p></div>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{actividad.videos.length}</span>
                  </div>
                  <label className="mt-3 block cursor-pointer rounded-lg border border-dashed border-blue-300 bg-blue-50/50 p-3 text-center text-xs font-semibold text-blue-800 hover:bg-blue-50">
                    + Agregar videos
                    <input type="file" accept="video/*" multiple onChange={(e) => Array.from(e.target.files || []).forEach((archivo) => void subirImagenActividad(actividad.id, archivo))} className="sr-only" />
                  </label>
                </div>
                <div className="rounded-xl border border-red-100 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div><p className="text-sm font-bold text-gray-800">Documentos</p><p className="text-xs text-gray-500">Archivos PDF</p></div>
                    <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700">{actividad.pdfs.length}</span>
                  </div>
                  <label className="mt-3 block cursor-pointer rounded-lg border border-dashed border-red-300 bg-red-50/50 p-3 text-center text-xs font-semibold text-red-800 hover:bg-red-50">
                    + Agregar PDF
                    <input type="file" accept=".pdf,application/pdf" multiple onChange={(e) => Array.from(e.target.files || []).forEach((archivo) => void subirImagenActividad(actividad.id, archivo))} className="sr-only" />
                  </label>
                </div>
              </div>
              <p className="text-xs text-gray-500">Medios guardados: {actividad.imagenes.length} foto(s), {actividad.videos.length} video(s) y {actividad.pdfs.length} documento(s).</p>
              <div className="flex flex-wrap gap-3">
                {actividad.imagenes.map((url, indice) => <div key={url} className="relative h-20 w-24 overflow-hidden rounded-lg border bg-white shadow-sm"><img src={url} alt={`Foto ${indice + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => void quitarMediaActividad(actividad.id, 'imagenes', indice)} aria-label={`Quitar foto ${indice + 1}`} className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white"><X className="h-3 w-3" /></button><span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 text-center text-[10px] text-white">Foto {indice + 1}</span></div>)}
                {actividad.videos.map((url, indice) => <div key={url} className="relative flex h-20 w-24 items-center justify-center overflow-hidden rounded-lg border bg-slate-800 text-center text-[10px] text-white shadow-sm"><span>Video {indice + 1}</span><button type="button" onClick={() => void quitarMediaActividad(actividad.id, 'videos', indice)} aria-label={`Quitar video ${indice + 1}`} className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white"><X className="h-3 w-3" /></button></div>)}
                {actividad.pdfs.map((url, indice) => <div key={url} className="relative flex h-20 w-24 items-center justify-center rounded-lg border bg-red-50 text-center text-xs text-red-700 shadow-sm"><span>PDF {indice + 1}</span><button type="button" onClick={() => void quitarMediaActividad(actividad.id, 'pdfs', indice)} aria-label={`Quitar PDF ${indice + 1}`} className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white"><X className="h-3 w-3" /></button></div>)}
              </div>
              {(actividad.ganadores.length > 0 || actividad.titulo.toLowerCase().includes('feria')) && <div className="space-y-2 rounded-lg border border-green-100 bg-green-50 p-3">
                <p className="text-sm font-bold text-green-800">Ganadores de la Feria de Proyectos</p>
                {actividad.ganadores.map((ganador, indice) => (
                  <div key={ganador.lugar} className="space-y-2 rounded-lg border border-green-100 bg-white p-3">
                    <p className="text-sm font-bold text-green-800">{ganador.lugar}.º lugar</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      <input value={ganador.proyecto} onChange={(e) => actualizarGanador(actividad.id, indice, 'proyecto', e.target.value)} placeholder="Nombre del proyecto" className="rounded border px-2 py-1 text-sm" />
                      <input value={ganador.participantes} onChange={(e) => actualizarGanador(actividad.id, indice, 'participantes', e.target.value)} placeholder="Participantes" className="rounded border px-2 py-1 text-sm" />
                      <input value={ganador.asesor} onChange={(e) => actualizarGanador(actividad.id, indice, 'asesor', e.target.value)} placeholder="Asesor" className="rounded border px-2 py-1 text-sm" />
                      <input value={ganador.organizacion} onChange={(e) => actualizarGanador(actividad.id, indice, 'organizacion', e.target.value)} placeholder="Escuela u organización" className="rounded border px-2 py-1 text-sm" />
                      <input value={ganador.contacto} onChange={(e) => actualizarGanador(actividad.id, indice, 'contacto', e.target.value)} placeholder="Contacto" className="rounded border px-2 py-1 text-sm" />
                      <input value={ganador.descripcion} onChange={(e) => actualizarGanador(actividad.id, indice, 'descripcion', e.target.value)} placeholder="Descripción del proyecto" className="rounded border px-2 py-1 text-sm" />
                    </div>
                    {ganador.imagen && <img src={ganador.imagen} alt={`Imagen del ${ganador.lugar}.º lugar`} className="h-24 w-32 rounded object-cover" />}
                    <label className="flex items-center rounded border bg-gray-50 px-2 py-1 text-xs text-gray-500">Imagen del proyecto<input type="file" accept="image/*" onChange={(e) => { const archivo = e.target.files?.[0]; if (archivo) void subirImagenGanador(actividad.id, indice, archivo); }} className="ml-2 min-w-0 text-xs text-gray-700" /></label>
                  </div>
                ))}
              </div>}
              {actividad.ganadores.length === 0 && actividad.titulo.toLowerCase().includes('feria') && <button type="button" onClick={() => agregarGanadores(actividad.id)} className="rounded-lg border border-green-600 px-3 py-1.5 text-xs font-bold text-green-700">Agregar información de los 3 lugares</button>}
              <div className="flex gap-2">
                <button type="button" onClick={() => void guardarActividad(actividad)} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white"><Save className="mr-1 inline h-3.5 w-3.5" /> Guardar</button>
                <button type="button" onClick={() => void eliminarActividad(actividad.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600"><Trash2 className="mr-1 inline h-3.5 w-3.5" /> Eliminar</button>
              </div>
              </div>
            </details>)}
            <details className="group overflow-hidden rounded-xl border-2 border-dashed border-green-200 bg-green-50/30">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-4 font-bold text-green-700"><Plus className="h-5 w-5" /> Agregar nueva actividad <ChevronDown className="ml-auto h-5 w-5 transition-transform group-open:rotate-180" /></summary>
              <div className="grid gap-3 border-t border-green-100 p-4 md:grid-cols-2">
              <input value={actividadForm.titulo} onChange={(e) => setActividadForm({ ...actividadForm, titulo: e.target.value })} placeholder="Título de la actividad (ej. Feria de proyectos)" className="rounded-lg border px-3 py-2" />
              <input value={actividadForm.subtitulo} onChange={(e) => setActividadForm({ ...actividadForm, subtitulo: e.target.value })} placeholder="Subtítulo (ej. Presentación y premiación)" className="rounded-lg border px-3 py-2" />
              <input type="date" value={actividadForm.fecha} onChange={(e) => setActividadForm({ ...actividadForm, fecha: e.target.value })} className="rounded-lg border px-3 py-2" />
              <textarea value={actividadForm.imagenes} onChange={(e) => setActividadForm({ ...actividadForm, imagenes: e.target.value })} placeholder="Fotos: una URL por línea (sin límite)" rows={2} className="rounded-lg border px-3 py-2" />
              <input type="file" accept="image/*,video/*" multiple onChange={(e) => setActividadForm({ ...actividadForm, archivos: Array.from(e.target.files || []) })} className="rounded-lg border bg-white px-3 py-2" />
              <input value={actividadForm.enlace_url} onChange={(e) => setActividadForm({ ...actividadForm, enlace_url: e.target.value })} placeholder="URL opcional" className="rounded-lg border px-3 py-2" />
            </div>
            <textarea value={actividadForm.descripcion} onChange={(e) => setActividadForm({ ...actividadForm, descripcion: e.target.value })} placeholder="Descripción de la actividad" rows={2} className="w-full rounded-lg border px-3 py-2" />
            {archivosVista.length > 0 && <div className="rounded-lg border border-green-100 bg-green-50 p-3"><p className="mb-2 text-sm font-bold text-green-800">Archivos seleccionados: se subirán al pulsar “Agregar actividad”</p><div className="flex flex-wrap gap-3">{archivosVista.map(({ archivo, url }, indice) => <div key={url} className="relative w-32">{archivo.type.startsWith('video/') ? <video src={url} controls className="h-20 w-full rounded object-cover" /> : <img src={url} alt={archivo.name} className="h-20 w-full rounded object-cover" />}<button type="button" onClick={() => setActividadForm((actual) => ({ ...actual, archivos: actual.archivos.filter((_, posicion) => posicion !== indice) }))} aria-label={`Quitar ${archivo.name}`} className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white"><X className="h-3 w-3" /></button><p className="truncate text-xs text-gray-600">{archivo.name}</p></div>)}</div></div>}
            <label className="block text-sm font-semibold text-gray-700">Videos externos (URLs)<span className="mt-1 block text-xs font-normal text-gray-500">Opcional: un enlace de YouTube, Vimeo o Storage por línea.</span><textarea value={actividadForm.videos} onChange={(e) => setActividadForm({ ...actividadForm, videos: e.target.value })} placeholder="https://..." aria-label="Videos externos" rows={2} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
            <label className="block text-sm font-semibold text-gray-700">Documentos PDF externos (URLs)<span className="mt-1 block text-xs font-normal text-gray-500">Opcional: un enlace de PDF por línea.</span><textarea value={actividadForm.pdfs} onChange={(e) => setActividadForm({ ...actividadForm, pdfs: e.target.value })} placeholder="https://..." aria-label="Documentos PDF externos" rows={2} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
            <label className="flex items-center rounded-lg border bg-white px-3 py-2 text-xs text-gray-500">Agregar documentos PDF<input type="file" accept=".pdf,application/pdf" multiple onChange={(e) => setActividadForm({ ...actividadForm, pdfArchivos: Array.from(e.target.files || []) })} className="ml-2 min-w-0 text-xs text-gray-700" /></label>
            {actividadForm.pdfArchivos.length > 0 && <p className="text-sm text-gray-600">PDF seleccionados: {actividadForm.pdfArchivos.map((archivo) => archivo.name).join(', ')}. Se subirán al agregar la actividad.</p>}
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700"><input type="checkbox" checked={actividadForm.ganadores} onChange={(e) => setActividadForm({ ...actividadForm, ganadores: e.target.checked })} className="h-4 w-4 accent-green-600" /> Incluir sección de ganadores (1.º, 2.º y 3.º lugar)</label>
                <button type="button" onClick={() => void agregarActividad()} className="rounded-lg border border-green-600 px-4 py-2 text-sm font-bold text-green-700"><Plus className="mr-1 inline h-4 w-4" /> Agregar actividad</button>
            </details>
          </div>}
        </CardContent>}
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
