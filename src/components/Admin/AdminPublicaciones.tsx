import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertCircle, Edit, Eye, EyeOff, Image, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImagenAmpliable } from '@/components/VisorImagenes';
import { useUrlLocal } from '@/lib/useUrlLocal';
import { formatearFecha } from '@/lib/utils';
import ConexionRedes from './ConexionRedes';
import SugerenciasIA from './SugerenciasIA';

type RedSocial = 'instagram' | 'facebook';

interface Publicacion {
  id: string;
  texto: string | null;
  imagen_url: string | null; // null: solo texto
  es_video: boolean;
  red_social: RedSocial;
  enlace_url: string | null;
  fecha_publicacion: string;
  activo: boolean;
  origen?: 'manual' | 'automatico'; // 'automatico' = traída de Meta por sincronizar-redes
}

interface FormularioPublicacion {
  texto: string;
  red_social: RedSocial;
  enlace_url: string;
  fecha_publicacion: string;
  es_video: boolean;
  imagen: File | null;
}

const BUCKET = 'imagenes_publicaciones';
const LIMITE_TEXTO = 300;
const POR_PAGINA = 24;

type FiltroRed = 'todas' | RedSocial;
type FiltroEstado = 'todas' | 'visibles' | 'ocultas';
type FiltroOrigen = 'todas' | 'automatico' | 'manual';

const OPCIONES_RED: { valor: FiltroRed; nombre: string }[] = [
  { valor: 'todas', nombre: 'Todas' },
  { valor: 'facebook', nombre: 'Facebook' },
  { valor: 'instagram', nombre: 'Instagram' },
];
const OPCIONES_ESTADO: { valor: FiltroEstado; nombre: string }[] = [
  { valor: 'todas', nombre: 'Todas' },
  { valor: 'visibles', nombre: 'Visibles' },
  { valor: 'ocultas', nombre: 'Ocultas' },
];
const OPCIONES_ORIGEN: { valor: FiltroOrigen; nombre: string }[] = [
  { valor: 'todas', nombre: 'Todas' },
  { valor: 'automatico', nombre: 'Automáticas' },
  { valor: 'manual', nombre: 'Manuales' },
];

function GrupoFiltro<T extends string>({ titulo, opciones, valor, onCambio }: {
  titulo: string;
  opciones: { valor: T; nombre: string }[];
  valor: T;
  onCambio: (valor: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{titulo}</span>
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          onClick={() => onCambio(opcion.valor)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${valor === opcion.valor ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          {opcion.nombre}
        </button>
      ))}
    </div>
  );
}

const hoy = () => new Date().toLocaleDateString('en-CA');

const crearFormularioInicial = (): FormularioPublicacion => ({
  texto: '',
  red_social: 'instagram',
  enlace_url: '',
  fecha_publicacion: hoy(),
  es_video: false,
  imagen: null,
});

function obtenerRutaImagen(url: string) {
  const marcador = `/storage/v1/object/public/${BUCKET}/`;
  const indice = url.indexOf(marcador);
  return indice === -1 ? null : decodeURIComponent(url.slice(indice + marcador.length));
}

export default function AdminPublicaciones() {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [formulario, setFormulario] = useState(crearFormularioInicial);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [imagenActual, setImagenActual] = useState('');
  const urlImagenNueva = useUrlLocal(formulario.imagen);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sube al sincronizar para que la bandeja de sugerencias se recargue
  const [versionSugerencias, setVersionSugerencias] = useState(0);
  const [filtroRed, setFiltroRed] = useState<FiltroRed>('todas');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todas');
  const [filtroOrigen, setFiltroOrigen] = useState<FiltroOrigen>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [mostrando, setMostrando] = useState(POR_PAGINA);

  useEffect(() => {
    cargarPublicaciones();
  }, []);

  // Al cambiar un filtro se vuelve a la primera página
  useEffect(() => {
    setMostrando(POR_PAGINA);
  }, [filtroRed, filtroEstado, filtroOrigen, busqueda]);

  const textoBuscado = busqueda.trim().toLowerCase();
  const filtradas = publicaciones.filter((publicacion) =>
    (filtroRed === 'todas' || publicacion.red_social === filtroRed)
    && (filtroEstado === 'todas' || publicacion.activo === (filtroEstado === 'visibles'))
    && (filtroOrigen === 'todas' || (publicacion.origen ?? 'manual') === filtroOrigen)
    && (!textoBuscado || (publicacion.texto ?? '').toLowerCase().includes(textoBuscado)));
  const hayFiltros = filtroRed !== 'todas' || filtroEstado !== 'todas' || filtroOrigen !== 'todas' || textoBuscado !== '';

  function limpiarFiltros() {
    setFiltroRed('todas');
    setFiltroEstado('todas');
    setFiltroOrigen('todas');
    setBusqueda('');
  }

  async function cargarPublicaciones() {
    setCargando(true);
    setError(null);

    const { data, error: errorConsulta } = await supabase
      .from('publicaciones')
      .select('*')
      .order('fecha_publicacion', { ascending: false })
      .order('created_at', { ascending: false });

    if (errorConsulta) {
      setError('No se pudieron cargar las publicaciones.');
      console.error(errorConsulta);
    } else {
      setPublicaciones((data || []) as Publicacion[]);
    }
    setCargando(false);
  }

  function cerrarFormulario() {
    setEditandoId(null);
    setImagenActual('');
    setFormulario(crearFormularioInicial());
    setFormularioAbierto(false);
  }

  function abrirNueva() {
    setEditandoId(null);
    setImagenActual('');
    setFormulario(crearFormularioInicial());
    setFormularioAbierto(true);
  }

  function abrirEdicion(publicacion: Publicacion) {
    setEditandoId(publicacion.id);
    setImagenActual(publicacion.imagen_url ?? '');
    setFormulario({
      texto: publicacion.texto || '',
      red_social: publicacion.red_social,
      enlace_url: publicacion.enlace_url || '',
      fecha_publicacion: publicacion.fecha_publicacion,
      es_video: publicacion.es_video,
      imagen: null,
    });
    setFormularioAbierto(true);
  }

  function manejarCambio(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
  }

  function manejarImagen(e: ChangeEvent<HTMLInputElement>) {
    setFormulario((actual) => ({ ...actual, imagen: e.target.files?.[0] || null }));
  }

  async function subirImagen(imagen: File) {
    const extension = imagen.name.split('.').pop()?.toLowerCase() || 'jpg';
    const ruta = `publicaciones/${crypto.randomUUID()}.${extension}`;
    const { error: errorSubida } = await supabase.storage.from(BUCKET).upload(ruta, imagen, {
      cacheControl: '3600',
      contentType: imagen.type,
      upsert: false,
    });

    if (errorSubida) throw errorSubida;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(ruta);
    return { ruta, url: data.publicUrl };
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    // Sin imagen se muestra como tarjeta de texto, así que necesita texto
    if (!formulario.imagen && !imagenActual && !formulario.texto.trim()) {
      toast.error('Selecciona una imagen o escribe el texto de la publicación.');
      return;
    }

    setGuardando(true);
    let imagenSubida: { ruta: string; url: string } | null = null;

    try {
      const publicacionActual = publicaciones.find((item) => item.id === editandoId);
      let imagenUrl = imagenActual || null; // Vacía si se quitó con ✕

      if (formulario.imagen) {
        imagenSubida = await subirImagen(formulario.imagen);
        imagenUrl = imagenSubida.url;
      }

      const datos = {
        texto: formulario.texto.trim() || null,
        red_social: formulario.red_social,
        enlace_url: formulario.enlace_url.trim() || null,
        fecha_publicacion: formulario.fecha_publicacion || hoy(),
        es_video: formulario.es_video,
        imagen_url: imagenUrl,
      };

      const respuesta = editandoId
        ? await supabase.from('publicaciones').update(datos).eq('id', editandoId)
        : await supabase.from('publicaciones').insert({ ...datos, activo: true });

      if (respuesta.error) throw respuesta.error;

      if (editandoId && publicacionActual?.imagen_url && imagenUrl !== publicacionActual.imagen_url) {
        const rutaAnterior = obtenerRutaImagen(publicacionActual.imagen_url);
        if (rutaAnterior) await supabase.storage.from(BUCKET).remove([rutaAnterior]);
      }

      toast.success(editandoId ? 'Publicación actualizada.' : 'Publicación agregada.');
      cerrarFormulario();
      await cargarPublicaciones();
    } catch (err) {
      if (imagenSubida) await supabase.storage.from(BUCKET).remove([imagenSubida.ruta]);
      console.error(err);
      toast.error('No se pudo guardar la publicación.');
    } finally {
      setGuardando(false);
    }
  }

  async function alternarEstado(publicacion: Publicacion) {
    const { error: errorActualizacion } = await supabase
      .from('publicaciones')
      .update({ activo: !publicacion.activo })
      .eq('id', publicacion.id);

    if (errorActualizacion) {
      toast.error('No se pudo cambiar el estado.');
      return;
    }
    setPublicaciones((actuales) => actuales.map((item) => item.id === publicacion.id
      ? { ...item, activo: !item.activo }
      : item));
  }

  async function eliminar(publicacion: Publicacion) {
    if (!window.confirm('¿Eliminar esta publicación? Esta acción no se puede deshacer.')) return;

    const { error: errorEliminacion } = await supabase
      .from('publicaciones')
      .delete()
      .eq('id', publicacion.id);

    if (errorEliminacion) {
      toast.error('No se pudo eliminar la publicación.');
      return;
    }

    const ruta = publicacion.imagen_url && obtenerRutaImagen(publicacion.imagen_url);
    if (ruta) await supabase.storage.from(BUCKET).remove([ruta]);
    setPublicaciones((actuales) => actuales.filter((item) => item.id !== publicacion.id));
    toast.success('Publicación eliminada.');
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-2 sm:py-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 border-b border-[#4A2E18]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Publicaciones</h1>
          <p className="mt-1 font-medium text-green-700">Lo que se publica en Facebook e Instagram de FDMA aparece en la página de inicio</p>
        </div>
        <button onClick={abrirNueva} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
          <Plus className="h-5 w-5" /> Nueva publicación
        </button>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700"><AlertCircle className="h-5 w-5" />{error}</div>}

      <ConexionRedes onSincronizado={() => { cargarPublicaciones(); setVersionSugerencias((actual) => actual + 1); }} />

      <SugerenciasIA version={versionSugerencias} />

      {formularioAbierto && (
        <Card className="border-transparent bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50 px-6 py-4">
            <CardTitle className="text-lg text-gray-800">{editandoId ? 'Editar publicación' : 'Nueva publicación'}</CardTitle>
            <button onClick={cerrarFormulario} className="rounded-lg p-2 text-gray-500 hover:bg-gray-200" title="Cerrar formulario"><X className="h-5 w-5" /></button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={guardar} className="grid gap-5 md:grid-cols-2">
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-700">Red social
                    <select name="red_social" value={formulario.red_social} onChange={manejarCambio} className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-green-500 focus:outline-none">
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">Fecha
                    <input name="fecha_publicacion" type="date" value={formulario.fecha_publicacion} onChange={manejarCambio} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" required />
                  </label>
                </div>
                <label className="block text-sm font-semibold text-gray-700">Enlace a la publicación (Opcional)
                  <input name="enlace_url" type="url" placeholder="https://www.instagram.com/p/..." value={formulario.enlace_url} onChange={manejarCambio} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" />
                  <span className="mt-1 block text-xs font-normal text-gray-500">En Instagram o Facebook: ··· → Copiar enlace.</span>
                </label>
                <label className="block text-sm font-semibold text-gray-700">Texto (Opcional)
                  <textarea name="texto" value={formulario.texto} onChange={manejarCambio} maxLength={LIMITE_TEXTO} rows={4} className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" />
                  <span className={`mt-1 block text-right text-xs font-medium ${formulario.texto.length >= LIMITE_TEXTO ? 'text-red-600' : 'text-gray-500'}`}>
                    {formulario.texto.length} / {LIMITE_TEXTO} caracteres permitidos
                  </span>
                </label>
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">Imagen{formulario.texto.trim() && ' (Opcional: sin imagen se muestra solo el texto)'}{!(urlImagenNueva || imagenActual) && <input type="file" accept="image/jpeg,image/png,image/webp" onChange={manejarImagen} className="mt-2 block w-full rounded-lg border border-gray-300 p-2 text-sm" required={!formulario.texto.trim()} />}</label>
                {(urlImagenNueva || imagenActual) && (
                  <div>
                    <ImagenAmpliable src={urlImagenNueva || imagenActual} alt="Imagen de la publicación" className="aspect-square w-full max-w-xs rounded-lg" onQuitar={() => (formulario.imagen ? setFormulario((actual) => ({ ...actual, imagen: null })) : setImagenActual(''))} />
                    <p className="mt-1 text-xs text-gray-500">{formulario.imagen ? `Nueva: ${formulario.imagen.name}` : 'Imagen actual'} · clic para verla en grande, ✕ para quitarla</p>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <input type="checkbox" checked={formulario.es_video} onChange={(e) => setFormulario((actual) => ({ ...actual, es_video: e.target.checked }))} className="h-4 w-4 accent-green-600" />
                  Es un video o reel (muestra ▶ sobre la imagen)
                </label>
                <button type="submit" disabled={guardando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {guardando ? <><Loader2 className="h-5 w-5 animate-spin" /> Guardando...</> : <><Image className="h-5 w-5" /> Guardar publicación</>}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-transparent bg-white shadow-sm">
        <CardHeader className="border-b bg-gray-50/50 px-6 py-4"><CardTitle className="text-lg text-gray-800">Publicaciones registradas</CardTitle></CardHeader>
        <CardContent className="p-4 sm:p-6">
          {cargando ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
          ) : publicaciones.length === 0 ? (
            <p className="p-8 text-center text-gray-600">Aún no hay publicaciones. Agrega la primera con "Nueva publicación".</p>
          ) : (
            <>
            <div className="mb-5 space-y-3 rounded-xl bg-gray-50 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar en el texto de las publicaciones..."
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-green-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:gap-6">
                <GrupoFiltro titulo="Red" opciones={OPCIONES_RED} valor={filtroRed} onCambio={setFiltroRed} />
                <GrupoFiltro titulo="Estado" opciones={OPCIONES_ESTADO} valor={filtroEstado} onCambio={setFiltroEstado} />
                <GrupoFiltro titulo="Origen" opciones={OPCIONES_ORIGEN} valor={filtroOrigen} onCambio={setFiltroOrigen} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{filtradas.length} de {publicaciones.length} publicaciones</span>
                {hayFiltros && <button type="button" onClick={limpiarFiltros} className="font-semibold text-green-700 hover:underline">Quitar filtros</button>}
              </div>
            </div>

            {filtradas.length === 0 ? (
              <p className="p-8 text-center text-gray-600">Ninguna publicación coincide con los filtros.</p>
            ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtradas.slice(0, mostrando).map((publicacion) => (
                <article key={publicacion.id} className={`overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm ${publicacion.activo ? '' : 'opacity-50'}`}>
                  <div className="relative aspect-square bg-[#f8f5f2]">
                    {publicacion.imagen_url
                      ? <ImagenAmpliable src={publicacion.imagen_url} alt="Publicación" className="h-full w-full" />
                      : <p className="flex h-full w-full items-center bg-[#2d6a4f] p-3 pt-11 text-xs leading-snug text-white"><span className="line-clamp-[7]">{publicacion.texto}</span></p>}
                    {publicacion.es_video && <span aria-label="Video" className="pointer-events-none absolute inset-0 m-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white"><span className="ml-0.5">▶</span></span>}
                    <img src={publicacion.red_social === 'facebook' ? '/fb-icon.svg' : '/ig-icon.svg'} alt={publicacion.red_social} className="absolute left-2 top-2 h-7 w-7 rounded-full bg-white p-1 shadow" />
                    {!publicacion.activo && <span className="absolute right-2 top-2 rounded-full bg-gray-800 px-2 py-0.5 text-xs font-semibold text-white">Oculta</span>}
                    {publicacion.origen === 'automatico' && <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-green-700 shadow">Automática</span>}
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs text-gray-500">{formatearFecha(publicacion.fecha_publicacion)}</span>
                    <div className="flex gap-1">
                      <button onClick={() => abrirEdicion(publicacion)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-green-600" title="Editar"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => alternarEstado(publicacion)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-green-600" title={publicacion.activo ? 'Ocultar' : 'Mostrar'}>{publicacion.activo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      {/* Una automática borrada se volvería a importar: para quitarla de la página se oculta */}
                      {publicacion.origen !== 'automatico' && (
                        <button onClick={() => eliminar(publicacion)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-600" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            )}

            {filtradas.length > mostrando && (
              <div className="mt-6 flex justify-center">
                <button type="button" onClick={() => setMostrando((actual) => actual + POR_PAGINA)} className="rounded-xl border border-green-600 px-5 py-2 text-sm font-semibold text-green-700 hover:bg-green-50">
                  Mostrar más ({filtradas.length - mostrando} restantes)
                </button>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
