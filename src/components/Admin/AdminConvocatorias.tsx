import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertCircle, Edit, Eye, EyeOff, Image, Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImagenAmpliable } from '@/components/VisorImagenes';
import { useUrlLocal } from '@/lib/useUrlLocal';

interface Convocatoria {
  id: string;
  titulo: string;
  descripcion: string;
  imagen_url: string;
  enlace_url?: string;
  fecha_cierre?: string | null; // Fecha límite opcional: sale en el Calendario y la oculta de la landing al pasar
  texto_boton?: string | null; // Vacío → "Registro"
  activo: boolean;
  created_at: string;
}

interface FormularioConvocatoria {
  titulo: string;
  descripcion: string;
  enlace_url: string;
  fecha_cierre: string;
  texto_boton: string;
  imagen: File | null;
}

const TEXTO_BOTON_POR_DEFECTO = 'Registro';
const SUGERENCIAS_BOTON = ['Registro', 'Más información', 'Descargar bases', 'Inscribirme'];

const BUCKET = 'imagenes_convocatorias';

const formularioInicial: FormularioConvocatoria = {
  titulo: '',
  descripcion: '',
  enlace_url: '',
  fecha_cierre: '',
  texto_boton: '',
  imagen: null,
};

const hoy = () => new Date().toLocaleDateString('en-CA');

const formatearCierre = (fecha: string) =>
  new Date(`${fecha}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

function obtenerRutaImagen(url: string) {
  const marcador = `/storage/v1/object/public/${BUCKET}/`;
  const indice = url.indexOf(marcador);
  return indice === -1 ? null : decodeURIComponent(url.slice(indice + marcador.length));
}

export default function AdminConvocatorias() {
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [imagenActual, setImagenActual] = useState('');
  const urlImagenNueva = useUrlLocal(formulario.imagen);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);

  useEffect(() => {
    cargarConvocatorias();
    verificarSuperAdmin();
  }, []);

  async function verificarSuperAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('roles(nombre)')
      .eq('auth_user_id', user.id)
      .single();

    const roles = usuario?.roles as { nombre?: string } | { nombre?: string }[] | null;
    const rol = Array.isArray(roles) ? roles[0]?.nombre : roles?.nombre;
    setEsSuperAdmin(rol === 'Super Admin');
  }

  async function cargarConvocatorias() {
    setCargando(true);
    setError(null);

    const { data, error: errorConsulta } = await supabase
      .from('convocatorias')
      .select('*')
      .order('created_at', { ascending: false });

    if (errorConsulta) {
      setError('No se pudieron cargar las convocatorias.');
      console.error(errorConsulta);
    } else {
      setConvocatorias((data || []) as Convocatoria[]);
    }
    setCargando(false);
  }

  function abrirNueva() {
    setEditandoId(null);
    setImagenActual('');
    setFormulario(formularioInicial);
    setFormularioAbierto(true);
  }

  function abrirEdicion(convocatoria: Convocatoria) {
    setEditandoId(convocatoria.id);
    setFormularioAbierto(true);
    setImagenActual(convocatoria.imagen_url);
    setFormulario({ titulo: convocatoria.titulo, descripcion: convocatoria.descripcion, enlace_url: convocatoria.enlace_url || '', fecha_cierre: convocatoria.fecha_cierre || '', texto_boton: convocatoria.texto_boton || '', imagen: null });
  }

  function manejarCambio(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
  }

  function manejarImagen(e: ChangeEvent<HTMLInputElement>) {
    setFormulario((actual) => ({ ...actual, imagen: e.target.files?.[0] || null }));
  }

  async function subirImagen(imagen: File) {
    const extension = imagen.name.split('.').pop()?.toLowerCase() || 'jpg';
    const ruta = `convocatorias/${crypto.randomUUID()}.${extension}`;
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
    if (!formulario.titulo.trim() || !formulario.descripcion.trim()) {
      toast.error('Completa el título y la descripción.');
      return;
    }
    if (!formulario.imagen && !imagenActual) {
      toast.error('Selecciona una imagen para la convocatoria.');
      return;
    }

    setGuardando(true);
    let imagenSubida: { ruta: string; url: string } | null = null;

    try {
      const convocatoriaActual = convocatorias.find((item) => item.id === editandoId);
      let imagenUrl = convocatoriaActual?.imagen_url || '';

      if (formulario.imagen) {
        imagenSubida = await subirImagen(formulario.imagen);
        imagenUrl = imagenSubida.url;
      }

      const datos = {
        titulo: formulario.titulo.trim(),
        descripcion: formulario.descripcion.trim(),
        enlace_url: formulario.enlace_url.trim() || null,
        fecha_cierre: formulario.fecha_cierre || null,
        texto_boton: formulario.texto_boton.trim() || null,
        imagen_url: imagenUrl,
        ...(editandoId ? {} : { activo: true }),
      };

      const respuesta = editandoId
        ? await supabase.from('convocatorias').update(datos).eq('id', editandoId)
        : await supabase.from('convocatorias').insert(datos);

      if (respuesta.error) throw respuesta.error;

      if (editandoId && formulario.imagen && convocatoriaActual?.imagen_url) {
        const rutaAnterior = obtenerRutaImagen(convocatoriaActual.imagen_url);
        if (rutaAnterior) await supabase.storage.from(BUCKET).remove([rutaAnterior]);
      }

      toast.success(editandoId ? 'Convocatoria actualizada.' : 'Convocatoria creada.');
      setFormulario(formularioInicial);
      setEditandoId(null);
      setImagenActual('');
      setFormularioAbierto(false);
      await cargarConvocatorias();
    } catch (err) {
      if (imagenSubida) await supabase.storage.from(BUCKET).remove([imagenSubida.ruta]);
      console.error(err);
      toast.error('No se pudo guardar la convocatoria.');
    } finally {
      setGuardando(false);
    }
  }

  async function alternarEstado(convocatoria: Convocatoria) {
    const { error: errorActualizacion } = await supabase
      .from('convocatorias')
      .update({ activo: !convocatoria.activo })
      .eq('id', convocatoria.id);

    if (errorActualizacion) {
      toast.error('No se pudo cambiar el estado.');
      return;
    }
    setConvocatorias((actuales) => actuales.map((item) => item.id === convocatoria.id
      ? { ...item, activo: !item.activo }
      : item));
  }

  async function eliminar(convocatoria: Convocatoria) {
    if (!window.confirm(`¿Eliminar "${convocatoria.titulo}"? Esta acción no se puede deshacer.`)) return;

    const { error: errorEliminacion } = await supabase
      .from('convocatorias')
      .delete()
      .eq('id', convocatoria.id);

    if (errorEliminacion) {
      toast.error('No se pudo eliminar la convocatoria.');
      return;
    }

    const ruta = obtenerRutaImagen(convocatoria.imagen_url);
    if (ruta) await supabase.storage.from(BUCKET).remove([ruta]);
    setConvocatorias((actuales) => actuales.filter((item) => item.id !== convocatoria.id));
    toast.success('Convocatoria eliminada.');
  }

  if (!esSuperAdmin && !cargando) {
    return <div className="mx-auto max-w-4xl p-8 text-center text-red-700">No tienes permisos para administrar convocatorias.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-2 sm:py-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 border-b border-[#4A2E18]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Convocatorias</h1>
          <p className="mt-1 font-medium text-green-700">Publica oportunidades para tu comunidad</p>
        </div>
        <button onClick={abrirNueva} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
          <Plus className="h-5 w-5" /> Nueva convocatoria
        </button>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700"><AlertCircle className="h-5 w-5" />{error}</div>}

      {formularioAbierto && (
        <Card className="border-transparent bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50 px-6 py-4">
            <CardTitle className="text-lg text-gray-800">{editandoId ? 'Editar convocatoria' : 'Nueva convocatoria'}</CardTitle>
            <button onClick={() => { setEditandoId(null); setFormulario(formularioInicial); setImagenActual(''); setFormularioAbierto(false); }} className="rounded-lg p-2 text-gray-500 hover:bg-gray-200" title="Cerrar formulario"><X className="h-5 w-5" /></button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={guardar} className="grid gap-5 md:grid-cols-2">
              <div className="space-y-5">
                <label className="block text-sm font-semibold text-gray-700">Título<input name="titulo" value={formulario.titulo} onChange={manejarCambio} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" required /></label>
                <label className="block text-sm font-semibold text-gray-700">Enlace de redirección (Opcional)<input name="enlace_url" type="url" placeholder="https://forms.gle/..." value={formulario.enlace_url} onChange={manejarCambio} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" /></label>
                {formulario.enlace_url.trim() && (
                  <label className="block text-sm font-semibold text-gray-700">Texto del botón (Opcional)
                    <input name="texto_boton" value={formulario.texto_boton} onChange={manejarCambio} maxLength={30} placeholder={TEXTO_BOTON_POR_DEFECTO} list="sugerencias-boton" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" />
                    <datalist id="sugerencias-boton">
                      {SUGERENCIAS_BOTON.map((texto) => <option key={texto} value={texto} />)}
                    </datalist>
                    <span className="mt-1 block text-xs font-normal text-gray-500">Lo que dice el botón verde. Si lo dejas vacío dice "{TEXTO_BOTON_POR_DEFECTO}".</span>
                  </label>
                )}
                <label className="block text-sm font-semibold text-gray-700">Fecha límite (Opcional)
                  <input name="fecha_cierre" type="date" value={formulario.fecha_cierre} onChange={manejarCambio} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" />
                  <span className="mt-1 block text-xs font-normal text-gray-500">Aparece en el Calendario y la convocatoria se oculta sola de la página al pasar esta fecha.</span>
                </label>
                <label className="block text-sm font-semibold text-gray-700">
  Descripción
  <textarea 
    name="descripcion" 
    value={formulario.descripcion} 
    onChange={manejarCambio} 
    maxLength={180} /* Limita físicamente la escritura a 180 caracteres */
    rows={4} 
    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none resize-none" 
    required 
  />
  {/* Contador dinámico que cambia a rojo al llegar al límite */}
  <span className={`text-xs block mt-1 text-right font-medium ${
    formulario.descripcion.length >= 180 ? 'text-red-600' : 'text-gray-500'
  }`}>
    {formulario.descripcion.length} / 180 caracteres permitidos
  </span>
</label>
               </div>
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">Imagen{!(urlImagenNueva || imagenActual) && <input type="file" accept="image/*" onChange={manejarImagen} className="mt-2 block w-full rounded-lg border border-gray-300 p-2 text-sm" required />}</label>
                {(urlImagenNueva || imagenActual) && (
                  <div>
                    <ImagenAmpliable src={urlImagenNueva || imagenActual} alt="Imagen de la convocatoria" className="h-40 w-full rounded-lg" onQuitar={() => (formulario.imagen ? setFormulario((actual) => ({ ...actual, imagen: null })) : setImagenActual(''))} />
                    <p className="mt-1 text-xs text-gray-500">{formulario.imagen ? `Nueva: ${formulario.imagen.name}` : 'Imagen actual'} · clic para verla en grande, ✕ para quitarla</p>
                  </div>
                )}
                <button type="submit" disabled={guardando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {guardando ? <><Loader2 className="h-5 w-5 animate-spin" /> Guardando...</> : <><Image className="h-5 w-5" /> Guardar convocatoria</>}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-transparent bg-white shadow-sm">
        <CardHeader className="border-b bg-gray-50/50 px-6 py-4"><CardTitle className="text-lg text-gray-800">Convocatorias registradas</CardTitle></CardHeader>
        <CardContent className="p-0">
          {cargando ? <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div> : convocatorias.length === 0 ? <p className="p-8 text-center text-gray-600">Aún no hay convocatorias registradas.</p> : <div className="overflow-x-auto"><table className="tabla-tarjetas w-full min-w-[860px] text-left text-sm"><thead className="border-b bg-white text-xs uppercase tracking-wider text-gray-500"><tr><th className="px-6 py-4">Imagen</th><th className="px-6 py-4">Título</th><th className="px-6 py-4">Estado</th><th className="px-6 py-4">Fecha</th><th className="px-6 py-4">Cierre</th><th className="px-6 py-4 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-gray-100">{convocatorias.map((convocatoria) => <tr key={convocatoria.id} className="hover:bg-green-50/30"><td className="px-6 py-4"><ImagenAmpliable src={convocatoria.imagen_url} alt={convocatoria.titulo} className="h-14 w-20 rounded-md" /></td><td className="max-w-xs px-6 py-4 font-semibold text-gray-900"><span className="line-clamp-3 md:line-clamp-2">{convocatoria.titulo}</span></td><td data-label="Estado" className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${convocatoria.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{convocatoria.activo ? 'Activa' : 'Inactiva'}</span></td><td data-label="Fecha" className="px-6 py-4 text-gray-600">{new Date(convocatoria.created_at).toLocaleDateString('es-MX')}</td><td data-completa data-label="Cierre" className="px-6 py-4 text-gray-600">{convocatoria.fecha_cierre ? <div className="flex flex-col items-start gap-1"><span>{formatearCierre(convocatoria.fecha_cierre)}</span>{convocatoria.fecha_cierre < hoy() && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Vencida</span>}</div> : <span className="text-gray-400">Sin fecha</span>}</td><td data-acciones className="px-6 py-4"><div className="flex justify-end gap-2"><button onClick={() => abrirEdicion(convocatoria)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-green-600" title="Editar"><Edit className="h-4 w-4" /></button><button onClick={() => alternarEstado(convocatoria)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-green-600" title={convocatoria.activo ? 'Desactivar' : 'Activar'}>{convocatoria.activo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button><button onClick={() => eliminar(convocatoria)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600" title="Eliminar"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>}
        </CardContent>
      </Card>
    </div>
  );
}
