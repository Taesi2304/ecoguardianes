import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertCircle, Edit, Eye, EyeOff, Image, Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatearFecha } from '@/lib/utils';

type RedSocial = 'instagram' | 'facebook';

interface Publicacion {
  id: string;
  texto: string | null;
  imagen_url: string;
  red_social: RedSocial;
  enlace_url: string | null;
  fecha_publicacion: string;
  activo: boolean;
}

interface FormularioPublicacion {
  texto: string;
  red_social: RedSocial;
  enlace_url: string;
  fecha_publicacion: string;
  imagen: File | null;
}

const BUCKET = 'imagenes_publicaciones';
const LIMITE_TEXTO = 300;

const hoy = () => new Date().toLocaleDateString('en-CA');

const crearFormularioInicial = (): FormularioPublicacion => ({
  texto: '',
  red_social: 'instagram',
  enlace_url: '',
  fecha_publicacion: hoy(),
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
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarPublicaciones();
  }, []);

  async function cargarPublicaciones() {
    setCargando(true);
    setError(null);

    const { data, error: errorConsulta } = await supabase
      .from('publicaciones')
      .select('id, texto, imagen_url, red_social, enlace_url, fecha_publicacion, activo')
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
    setImagenActual(publicacion.imagen_url);
    setFormulario({
      texto: publicacion.texto || '',
      red_social: publicacion.red_social,
      enlace_url: publicacion.enlace_url || '',
      fecha_publicacion: publicacion.fecha_publicacion,
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
    if (!editandoId && !formulario.imagen) {
      toast.error('Selecciona la imagen de la publicación.');
      return;
    }

    setGuardando(true);
    let imagenSubida: { ruta: string; url: string } | null = null;

    try {
      const publicacionActual = publicaciones.find((item) => item.id === editandoId);
      let imagenUrl = publicacionActual?.imagen_url || '';

      if (formulario.imagen) {
        imagenSubida = await subirImagen(formulario.imagen);
        imagenUrl = imagenSubida.url;
      }

      const datos = {
        texto: formulario.texto.trim() || null,
        red_social: formulario.red_social,
        enlace_url: formulario.enlace_url.trim() || null,
        fecha_publicacion: formulario.fecha_publicacion || hoy(),
        imagen_url: imagenUrl,
      };

      const respuesta = editandoId
        ? await supabase.from('publicaciones').update(datos).eq('id', editandoId)
        : await supabase.from('publicaciones').insert({ ...datos, activo: true });

      if (respuesta.error) throw respuesta.error;

      if (editandoId && formulario.imagen && publicacionActual?.imagen_url) {
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

    const ruta = obtenerRutaImagen(publicacion.imagen_url);
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
                <label className="block text-sm font-semibold text-gray-700">Imagen<input type="file" accept="image/jpeg,image/png,image/webp" onChange={manejarImagen} className="mt-2 block w-full rounded-lg border border-gray-300 p-2 text-sm" required={!editandoId} /></label>
                {imagenActual && !formulario.imagen && <img src={imagenActual} alt="Imagen actual" className="aspect-square w-full max-w-xs rounded-lg object-cover" />}
                {formulario.imagen && <img src={URL.createObjectURL(formulario.imagen)} alt="Vista previa" className="aspect-square w-full max-w-xs rounded-lg object-cover" />}
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {publicaciones.map((publicacion) => (
                <article key={publicacion.id} className={`overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm ${publicacion.activo ? '' : 'opacity-50'}`}>
                  <div className="relative aspect-square bg-[#f8f5f2]">
                    <img src={publicacion.imagen_url} alt="" className="h-full w-full object-cover" />
                    <img src={publicacion.red_social === 'facebook' ? '/fb-icon.svg' : '/ig-icon.svg'} alt={publicacion.red_social} className="absolute left-2 top-2 h-7 w-7 rounded-full bg-white p-1 shadow" />
                    {!publicacion.activo && <span className="absolute right-2 top-2 rounded-full bg-gray-800 px-2 py-0.5 text-xs font-semibold text-white">Oculta</span>}
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs text-gray-500">{formatearFecha(publicacion.fecha_publicacion)}</span>
                    <div className="flex gap-1">
                      <button onClick={() => abrirEdicion(publicacion)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-green-600" title="Editar"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => alternarEstado(publicacion)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-green-600" title={publicacion.activo ? 'Ocultar' : 'Mostrar'}>{publicacion.activo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      <button onClick={() => eliminar(publicacion)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-600" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
