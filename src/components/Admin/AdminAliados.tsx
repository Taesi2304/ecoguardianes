import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertCircle, Edit, Eye, EyeOff, Image, Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useScrollAlFormulario } from '@/lib/useScrollAlFormulario';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImagenAmpliable } from '@/components/VisorImagenes';
import { useUrlLocal } from '@/lib/useUrlLocal';

interface Aliado {
  id: string;
  nombre: string;
  enlace_url: string;
  imagen_url: string;
  orden: number;
  activo: boolean;
}

interface FormularioAliado {
  nombre: string;
  enlace_url: string;
  orden: string;
  imagen: File | null;
}

const BUCKET = 'imagenes_aliados';

const formularioInicial: FormularioAliado = {
  nombre: '',
  enlace_url: '',
  orden: '',
  imagen: null,
};

// Devuelve null para las imágenes que viven en /public (no se borran del Storage)
function obtenerRutaImagen(url: string) {
  const marcador = `/storage/v1/object/public/${BUCKET}/`;
  const indice = url.indexOf(marcador);
  return indice === -1 ? null : decodeURIComponent(url.slice(indice + marcador.length));
}

export default function AdminAliados() {
  const [aliados, setAliados] = useState<Aliado[]>([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const formularioRef = useScrollAlFormulario(formularioAbierto, editandoId);
  const [imagenActual, setImagenActual] = useState('');
  const urlImagenNueva = useUrlLocal(formulario.imagen);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarAliados();
  }, []);

  async function cargarAliados() {
    setCargando(true);
    setError(null);

    const { data, error: errorConsulta } = await supabase
      .from('aliados')
      .select('id, nombre, enlace_url, imagen_url, orden, activo')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true });

    if (errorConsulta) {
      setError('No se pudieron cargar los aliados.');
      console.error(errorConsulta);
    } else {
      setAliados((data || []) as Aliado[]);
    }
    setCargando(false);
  }

  function cerrarFormulario() {
    setEditandoId(null);
    setImagenActual('');
    setFormulario(formularioInicial);
    setFormularioAbierto(false);
  }

  function abrirNuevo() {
    setEditandoId(null);
    setImagenActual('');
    setFormulario({ ...formularioInicial, orden: String(aliados.length + 1) });
    setFormularioAbierto(true);
  }

  function abrirEdicion(aliado: Aliado) {
    setEditandoId(aliado.id);
    setImagenActual(aliado.imagen_url);
    setFormulario({ nombre: aliado.nombre, enlace_url: aliado.enlace_url, orden: String(aliado.orden), imagen: null });
    setFormularioAbierto(true);
  }

  function manejarCambio(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
  }

  function manejarImagen(e: ChangeEvent<HTMLInputElement>) {
    setFormulario((actual) => ({ ...actual, imagen: e.target.files?.[0] || null }));
  }

  async function subirImagen(imagen: File) {
    const extension = imagen.name.split('.').pop()?.toLowerCase() || 'jpg';
    const ruta = `aliados/${crypto.randomUUID()}.${extension}`;
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
    if (!formulario.nombre.trim() || !formulario.enlace_url.trim()) {
      toast.error('Completa el nombre y el enlace.');
      return;
    }
    if (!formulario.imagen && !imagenActual) {
      toast.error('Selecciona la foto o logo del aliado.');
      return;
    }

    setGuardando(true);
    let imagenSubida: { ruta: string; url: string } | null = null;

    try {
      const aliadoActual = aliados.find((item) => item.id === editandoId);
      let imagenUrl = aliadoActual?.imagen_url || '';

      if (formulario.imagen) {
        imagenSubida = await subirImagen(formulario.imagen);
        imagenUrl = imagenSubida.url;
      }

      const datos = {
        nombre: formulario.nombre.trim(),
        enlace_url: formulario.enlace_url.trim(),
        orden: Number(formulario.orden) || 0,
        imagen_url: imagenUrl,
      };

      const respuesta = editandoId
        ? await supabase.from('aliados').update(datos).eq('id', editandoId)
        : await supabase.from('aliados').insert({ ...datos, activo: true });

      if (respuesta.error) throw respuesta.error;

      if (editandoId && formulario.imagen && aliadoActual?.imagen_url) {
        const rutaAnterior = obtenerRutaImagen(aliadoActual.imagen_url);
        if (rutaAnterior) await supabase.storage.from(BUCKET).remove([rutaAnterior]);
      }

      toast.success(editandoId ? 'Aliado actualizado.' : 'Aliado agregado.');
      cerrarFormulario();
      await cargarAliados();
    } catch (err) {
      if (imagenSubida) await supabase.storage.from(BUCKET).remove([imagenSubida.ruta]);
      console.error(err);
      toast.error('No se pudo guardar el aliado.');
    } finally {
      setGuardando(false);
    }
  }

  async function alternarEstado(aliado: Aliado) {
    const { error: errorActualizacion } = await supabase
      .from('aliados')
      .update({ activo: !aliado.activo })
      .eq('id', aliado.id);

    if (errorActualizacion) {
      toast.error('No se pudo cambiar el estado.');
      return;
    }
    setAliados((actuales) => actuales.map((item) => item.id === aliado.id
      ? { ...item, activo: !item.activo }
      : item));
  }

  async function eliminar(aliado: Aliado) {
    if (!window.confirm(`¿Eliminar a "${aliado.nombre}"? Esta acción no se puede deshacer.`)) return;

    const { error: errorEliminacion } = await supabase
      .from('aliados')
      .delete()
      .eq('id', aliado.id);

    if (errorEliminacion) {
      toast.error('No se pudo eliminar el aliado.');
      return;
    }

    const ruta = obtenerRutaImagen(aliado.imagen_url);
    if (ruta) await supabase.storage.from(BUCKET).remove([ruta]);
    setAliados((actuales) => actuales.filter((item) => item.id !== aliado.id));
    toast.success('Aliado eliminado.');
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-2 sm:py-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 border-b border-[#4A2E18]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Aliados</h1>
          <p className="mt-1 font-medium text-green-700">Colectivos y negocios que aparecen en el carrusel de la página de inicio</p>
        </div>
        <button onClick={abrirNuevo} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
          <Plus className="h-5 w-5" /> Nuevo aliado
        </button>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700"><AlertCircle className="h-5 w-5" />{error}</div>}

      {formularioAbierto && (
        <Card ref={formularioRef} className="scroll-mt-24 border-transparent bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50 px-6 py-4">
            <CardTitle className="text-lg text-gray-800">{editandoId ? 'Editar aliado' : 'Nuevo aliado'}</CardTitle>
            <button onClick={cerrarFormulario} className="rounded-lg p-2 text-gray-500 hover:bg-gray-200" title="Cerrar formulario"><X className="h-5 w-5" /></button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={guardar} className="grid gap-5 md:grid-cols-2">
              <div className="space-y-5">
                <label className="block text-sm font-semibold text-gray-700">Nombre o usuario
                  <input name="nombre" placeholder="@vivero_monos_garden" value={formulario.nombre} onChange={manejarCambio} maxLength={100} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" required />
                </label>
                <label className="block text-sm font-semibold text-gray-700">Enlace (Instagram, Facebook o sitio web)
                  <input name="enlace_url" type="url" placeholder="https://www.instagram.com/..." value={formulario.enlace_url} onChange={manejarCambio} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" required />
                </label>
                <label className="block text-sm font-semibold text-gray-700">Orden en el carrusel
                  <input name="orden" type="number" min={0} value={formulario.orden} onChange={manejarCambio} className="mt-2 w-32 rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" />
                </label>
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">Foto o logo{!(urlImagenNueva || imagenActual) && <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={manejarImagen} className="mt-2 block w-full rounded-lg border border-gray-300 p-2 text-sm" required />}</label>
                {(urlImagenNueva || imagenActual) && (
                  <div className="flex items-center gap-3">
                    <ImagenAmpliable src={urlImagenNueva || imagenActual} alt="Foto o logo del aliado" className="h-24 w-24 rounded-full border" onQuitar={() => (formulario.imagen ? setFormulario((actual) => ({ ...actual, imagen: null })) : setImagenActual(''))} />
                    <p className="text-xs text-gray-500">{formulario.imagen ? `Nueva: ${formulario.imagen.name}` : 'Imagen actual'} · clic para verla en grande, ✕ para quitarla</p>
                  </div>
                )}
                <button type="submit" disabled={guardando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {guardando ? <><Loader2 className="h-5 w-5 animate-spin" /> Guardando...</> : <><Image className="h-5 w-5" /> Guardar aliado</>}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-transparent bg-white shadow-sm">
        <CardHeader className="border-b bg-gray-50/50 px-6 py-4"><CardTitle className="text-lg text-gray-800">Aliados registrados</CardTitle></CardHeader>
        <CardContent className="p-0">
          {cargando ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
          ) : aliados.length === 0 ? (
            <p className="p-8 text-center text-gray-600">Aún no hay aliados registrados.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {aliados.map((aliado) => (
                <li key={aliado.id} className={`flex items-center gap-4 px-6 py-3 ${aliado.activo ? '' : 'opacity-50'}`}>
                  <span className="w-6 text-center text-sm text-gray-400">{aliado.orden}</span>
                  <ImagenAmpliable src={aliado.imagen_url} alt={aliado.nombre} className="h-10 w-10 rounded-full border bg-white" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">{aliado.nombre}</p>
                    <a href={aliado.enlace_url} target="_blank" rel="noreferrer" className="block truncate text-xs text-gray-500 hover:text-green-700">{aliado.enlace_url}</a>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => abrirEdicion(aliado)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-green-600" title="Editar"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => alternarEstado(aliado)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-green-600" title={aliado.activo ? 'Ocultar' : 'Mostrar'}>{aliado.activo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    <button onClick={() => eliminar(aliado)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
