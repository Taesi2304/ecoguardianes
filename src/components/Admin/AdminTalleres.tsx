import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertCircle, Download, Edit, Eye, EyeOff, Image, Loader2, Plus, Trash2, Users, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImagenAmpliable } from '@/components/VisorImagenes';
import { useUrlLocal } from '@/lib/useUrlLocal';
import { textoFecha, textoHorario } from '@/components/Talleres/talleres';

interface Taller {
  id: string;
  titulo: string;
  facilitador: string | null;
  descripcion: string | null;
  imagen_url: string;
  fecha: string | null; // null = por confirmar
  hora_inicio: string | null;
  hora_fin: string | null;
  lugar: string;
  lugar_maps_url: string | null;
  whatsapp_url: string | null;
  cupo: number | null;
  costo: number | null;
  activo: boolean;
  registros_talleres: { count: number }[];
}

interface Registro {
  id: string;
  nombre: string;
  whatsapp: string;
  correo: string | null;
  created_at: string;
}

interface FormularioTaller {
  titulo: string;
  facilitador: string;
  descripcion: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  lugar_maps_url: string;
  whatsapp_url: string;
  cupo: string;
  conCosto: boolean;
  costo: string;
  imagen: File | null;
}

const BUCKET = 'imagenes_talleres';
const LIMITE_DESCRIPCION = 300;

const formularioInicial: FormularioTaller = {
  titulo: '',
  facilitador: '',
  descripcion: '',
  fecha: '',
  hora_inicio: '',
  hora_fin: '',
  lugar: '',
  lugar_maps_url: '',
  whatsapp_url: '',
  cupo: '',
  conCosto: false,
  costo: '',
  imagen: null,
};

const claseInput = 'mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none';

function obtenerRutaImagen(url: string) {
  const marcador = `/storage/v1/object/public/${BUCKET}/`;
  const indice = url.indexOf(marcador);
  return indice === -1 ? null : decodeURIComponent(url.slice(indice + marcador.length));
}

const hoy = () => new Date().toLocaleDateString('en-CA');

export default function AdminTalleres() {
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [imagenActual, setImagenActual] = useState('');
  const urlImagenNueva = useUrlLocal(formulario.imagen);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tallerInscritos, setTallerInscritos] = useState<Taller | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargandoRegistros, setCargandoRegistros] = useState(false);

  useEffect(() => {
    cargarTalleres();
  }, []);

  async function cargarTalleres() {
    setCargando(true);
    setError(null);

    const { data, error: errorConsulta } = await supabase
      .from('talleres')
      .select('id, titulo, facilitador, descripcion, imagen_url, fecha, hora_inicio, hora_fin, lugar, lugar_maps_url, whatsapp_url, cupo, costo, activo, registros_talleres(count)')
      .order('fecha', { ascending: false });

    if (errorConsulta) {
      setError('No se pudieron cargar los talleres.');
      console.error(errorConsulta);
    } else {
      setTalleres((data || []) as Taller[]);
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
    setFormulario(formularioInicial);
    setFormularioAbierto(true);
  }

  function abrirEdicion(taller: Taller) {
    setEditandoId(taller.id);
    setImagenActual(taller.imagen_url);
    setFormulario({
      titulo: taller.titulo,
      facilitador: taller.facilitador || '',
      descripcion: taller.descripcion || '',
      fecha: taller.fecha || '',
      hora_inicio: taller.hora_inicio?.slice(0, 5) || '',
      hora_fin: taller.hora_fin?.slice(0, 5) || '',
      lugar: taller.lugar,
      lugar_maps_url: taller.lugar_maps_url || '',
      whatsapp_url: taller.whatsapp_url || '',
      cupo: taller.cupo ? String(taller.cupo) : '',
      conCosto: taller.costo !== null,
      costo: taller.costo !== null ? String(taller.costo) : '',
      imagen: null,
    });
    setFormularioAbierto(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const ruta = `talleres/${crypto.randomUUID()}.${extension}`;
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
    if (!formulario.imagen && !imagenActual) {
      toast.error('Selecciona la imagen o cartel del taller.');
      return;
    }
    if (formulario.hora_fin && !formulario.hora_inicio) {
      toast.error('Escribe la hora de inicio o deja ambas vacías (por confirmar).');
      return;
    }
    if (formulario.hora_fin && formulario.hora_fin <= formulario.hora_inicio) {
      toast.error('La hora de término debe ser después de la hora de inicio.');
      return;
    }
    if (formulario.conCosto && !(Number(formulario.costo) > 0)) {
      toast.error('Escribe el monto de la cuota de recuperación.');
      return;
    }

    setGuardando(true);
    let imagenSubida: { ruta: string; url: string } | null = null;

    try {
      const tallerActual = talleres.find((item) => item.id === editandoId);
      let imagenUrl = tallerActual?.imagen_url || '';

      if (formulario.imagen) {
        imagenSubida = await subirImagen(formulario.imagen);
        imagenUrl = imagenSubida.url;
      }

      const datos = {
        titulo: formulario.titulo.trim(),
        facilitador: formulario.facilitador.trim() || null,
        descripcion: formulario.descripcion.trim() || null,
        fecha: formulario.fecha || null,
        hora_inicio: formulario.hora_inicio || null,
        hora_fin: formulario.hora_fin || null,
        lugar: formulario.lugar.trim(),
        lugar_maps_url: formulario.lugar_maps_url.trim() || null,
        whatsapp_url: formulario.whatsapp_url.trim() || null,
        cupo: Number(formulario.cupo) > 0 ? Number(formulario.cupo) : null,
        costo: formulario.conCosto ? Number(formulario.costo) : null,
        imagen_url: imagenUrl,
      };

      const respuesta = editandoId
        ? await supabase.from('talleres').update(datos).eq('id', editandoId)
        : await supabase.from('talleres').insert({ ...datos, activo: true });

      if (respuesta.error) throw respuesta.error;

      if (editandoId && formulario.imagen && tallerActual?.imagen_url) {
        const rutaAnterior = obtenerRutaImagen(tallerActual.imagen_url);
        if (rutaAnterior) await supabase.storage.from(BUCKET).remove([rutaAnterior]);
      }

      toast.success(editandoId ? 'Taller actualizado.' : 'Taller publicado.');
      cerrarFormulario();
      await cargarTalleres();
    } catch (err) {
      if (imagenSubida) await supabase.storage.from(BUCKET).remove([imagenSubida.ruta]);
      console.error(err);
      toast.error('No se pudo guardar el taller.');
    } finally {
      setGuardando(false);
    }
  }

  async function alternarEstado(taller: Taller) {
    const { error: errorActualizacion } = await supabase
      .from('talleres')
      .update({ activo: !taller.activo })
      .eq('id', taller.id);

    if (errorActualizacion) {
      toast.error('No se pudo cambiar el estado.');
      return;
    }
    setTalleres((actuales) => actuales.map((item) => item.id === taller.id
      ? { ...item, activo: !item.activo }
      : item));
  }

  async function eliminar(taller: Taller) {
    const inscritos = taller.registros_talleres[0]?.count ?? 0;
    const aviso = inscritos > 0 ? ` Se borrarán también sus ${inscritos} inscripciones.` : '';
    if (!window.confirm(`¿Eliminar "${taller.titulo}"?${aviso} Esta acción no se puede deshacer.`)) return;

    const { error: errorEliminacion } = await supabase
      .from('talleres')
      .delete()
      .eq('id', taller.id);

    if (errorEliminacion) {
      toast.error('No se pudo eliminar el taller.');
      return;
    }

    const ruta = obtenerRutaImagen(taller.imagen_url);
    if (ruta) await supabase.storage.from(BUCKET).remove([ruta]);
    setTalleres((actuales) => actuales.filter((item) => item.id !== taller.id));
    toast.success('Taller eliminado.');
  }

  async function verInscritos(taller: Taller) {
    setTallerInscritos(taller);
    setRegistros([]);
    setCargandoRegistros(true);

    const { data, error: errorConsulta } = await supabase
      .from('registros_talleres')
      .select('id, nombre, whatsapp, correo, created_at')
      .eq('taller_id', taller.id)
      .order('created_at', { ascending: true });

    if (errorConsulta) {
      toast.error('No se pudieron cargar los inscritos.');
      console.error(errorConsulta);
    } else {
      setRegistros((data || []) as Registro[]);
    }
    setCargandoRegistros(false);
  }

  async function eliminarRegistro(registro: Registro) {
    if (!window.confirm(`¿Quitar a ${registro.nombre} de la lista? Se libera su lugar.`)) return;

    const { error: errorEliminacion } = await supabase
      .from('registros_talleres')
      .delete()
      .eq('id', registro.id);

    if (errorEliminacion) {
      toast.error('No se pudo quitar la inscripción.');
      return;
    }
    setRegistros((actuales) => actuales.filter((item) => item.id !== registro.id));
    setTalleres((actuales) => actuales.map((item) => item.id === tallerInscritos?.id
      ? { ...item, registros_talleres: [{ count: Math.max((item.registros_talleres[0]?.count ?? 1) - 1, 0) }] }
      : item));
  }

  function exportarInscritos() {
    if (!tallerInscritos) return;
    const hoja = XLSX.utils.json_to_sheet(registros.map((registro, indice) => ({
      '#': indice + 1,
      Nombre: registro.nombre,
      WhatsApp: registro.whatsapp,
      Correo: registro.correo || '',
      'Fecha de registro': new Date(registro.created_at).toLocaleString('es-MX'),
    })));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Inscritos');
    const nombreArchivo = tallerInscritos.titulo.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ-]/g, '').trim().replace(/\s+/g, '_');
    XLSX.writeFile(libro, `Inscritos_${nombreArchivo}.xlsx`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-2 sm:py-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 border-b border-[#4A2E18]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Talleres extraordinarios</h1>
          <p className="mt-1 font-medium text-green-700">Talleres fuera del festival con registro en línea</p>
        </div>
        <button onClick={abrirNuevo} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
          <Plus className="h-5 w-5" /> Nuevo taller
        </button>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700"><AlertCircle className="h-5 w-5" />{error}</div>}

      {formularioAbierto && (
        <Card className="border-transparent bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50 px-6 py-4">
            <CardTitle className="text-lg text-gray-800">{editandoId ? 'Editar taller' : 'Nuevo taller'}</CardTitle>
            <button onClick={cerrarFormulario} className="rounded-lg p-2 text-gray-500 hover:bg-gray-200" title="Cerrar formulario"><X className="h-5 w-5" /></button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={guardar} className="grid gap-5 md:grid-cols-2">
              <div className="space-y-5">
                <label className="block text-sm font-semibold text-gray-700">Título
                  <input name="titulo" value={formulario.titulo} onChange={manejarCambio} maxLength={150} placeholder="Papel artesanal reciclado" className={claseInput} required />
                </label>
                <label className="block text-sm font-semibold text-gray-700">Facilitador / colectivo (Opcional)
                  <input name="facilitador" value={formulario.facilitador} onChange={manejarCambio} maxLength={150} className={claseInput} />
                </label>
                <div>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="block text-sm font-semibold text-gray-700">Fecha
                      <input name="fecha" type="date" min={editandoId ? undefined : hoy()} value={formulario.fecha} onChange={manejarCambio} className={claseInput} />
                    </label>
                    <label className="block text-sm font-semibold text-gray-700">Inicio
                      <input name="hora_inicio" type="time" value={formulario.hora_inicio} onChange={manejarCambio} className={claseInput} />
                    </label>
                    <label className="block text-sm font-semibold text-gray-700">Término
                      <input name="hora_fin" type="time" value={formulario.hora_fin} onChange={manejarCambio} className={claseInput} />
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Si aún no está confirmada, déjala vacía: en la página saldrá «Por confirmar».</p>
                </div>
                <label className="block text-sm font-semibold text-gray-700">Punto de encuentro
                  <input name="lugar" value={formulario.lugar} onChange={manejarCambio} maxLength={200} placeholder="Parque El Laguito, junto al kiosco" className={claseInput} required />
                </label>
                <label className="block text-sm font-semibold text-gray-700">Enlace de Google Maps (Opcional)
                  <input name="lugar_maps_url" type="url" value={formulario.lugar_maps_url} onChange={manejarCambio} placeholder="https://maps.app.goo.gl/..." className={claseInput} />
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <label className="col-span-1 block text-sm font-semibold text-gray-700">Cupo
                    <input name="cupo" type="number" min={1} value={formulario.cupo} onChange={manejarCambio} placeholder="Sin límite" className={claseInput} />
                  </label>
                  <label className="col-span-2 block text-sm font-semibold text-gray-700">Grupo de WhatsApp (Opcional)
                    <input name="whatsapp_url" type="url" value={formulario.whatsapp_url} onChange={manejarCambio} placeholder="https://chat.whatsapp.com/..." className={claseInput} />
                  </label>
                </div>
                <p className="-mt-3 text-xs text-gray-500">El enlace de WhatsApp solo se muestra a quien ya se registró.</p>
                <fieldset>
                  <legend className="text-sm font-semibold text-gray-700">Costo</legend>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {[{ valor: false, texto: 'Gratuito' }, { valor: true, texto: 'Cuota de recuperación' }].map(({ valor, texto }) => (
                      <button
                        key={texto}
                        type="button"
                        onClick={() => setFormulario((actual) => ({ ...actual, conCosto: valor }))}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold ${formulario.conCosto === valor ? 'border-green-600 bg-green-50 text-green-800' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                      >
                        {texto}
                      </button>
                    ))}
                  </div>
                  {formulario.conCosto && (
                    <label className="mt-3 block text-sm font-semibold text-gray-700">Monto (MXN)
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 mt-1 -translate-y-1/2 text-gray-500">$</span>
                        <input name="costo" type="number" min={1} step="0.01" value={formulario.costo} onChange={manejarCambio} placeholder="100" className={`${claseInput} pl-7`} required />
                      </div>
                    </label>
                  )}
                </fieldset>
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">Descripción (Opcional)
                  <textarea name="descripcion" value={formulario.descripcion} onChange={manejarCambio} maxLength={LIMITE_DESCRIPCION} rows={4} placeholder="Qué aprenderán, qué traer..." className={`${claseInput} resize-none`} />
                  <span className={`mt-1 block text-right text-xs font-medium ${formulario.descripcion.length >= LIMITE_DESCRIPCION ? 'text-red-600' : 'text-gray-500'}`}>
                    {formulario.descripcion.length} / {LIMITE_DESCRIPCION} caracteres permitidos
                  </span>
                </label>
                <label className="block text-sm font-semibold text-gray-700">Imagen o cartel{!(urlImagenNueva || imagenActual) && <input type="file" accept="image/jpeg,image/png,image/webp" onChange={manejarImagen} className="mt-2 block w-full rounded-lg border border-gray-300 p-2 text-sm" required />}</label>
                {(urlImagenNueva || imagenActual) && (
                  <div>
                    <ImagenAmpliable src={urlImagenNueva || imagenActual} alt="Imagen del taller" className="aspect-square w-full max-w-xs rounded-lg" onQuitar={() => (formulario.imagen ? setFormulario((actual) => ({ ...actual, imagen: null })) : setImagenActual(''))} />
                    <p className="mt-1 text-xs text-gray-500">{formulario.imagen ? `Nueva: ${formulario.imagen.name}` : 'Imagen actual'} · clic para verla en grande, ✕ para quitarla</p>
                  </div>
                )}
                <button type="submit" disabled={guardando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {guardando ? <><Loader2 className="h-5 w-5 animate-spin" /> Guardando...</> : <><Image className="h-5 w-5" /> Guardar taller</>}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-transparent bg-white shadow-sm">
        <CardHeader className="border-b bg-gray-50/50 px-6 py-4"><CardTitle className="text-lg text-gray-800">Talleres registrados</CardTitle></CardHeader>
        <CardContent className="p-0">
          {cargando ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
          ) : talleres.length === 0 ? (
            <p className="p-8 text-center text-gray-600">Aún no hay talleres. Agrega el primero con "Nuevo taller".</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {talleres.map((taller) => {
                const inscritos = taller.registros_talleres[0]?.count ?? 0;
                const pasado = taller.fecha !== null && taller.fecha < hoy();
                const lleno = taller.cupo !== null && inscritos >= taller.cupo;
                return (
                  <li key={taller.id} className={`flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center ${taller.activo && !pasado ? '' : 'opacity-60'}`}>
                    <ImagenAmpliable src={taller.imagen_url} alt={taller.titulo} className="h-16 w-16 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">{taller.titulo}</p>
                      <p className="text-sm text-gray-500">{textoFecha(taller.fecha)} · {textoHorario(taller.hora_inicio, null)} · {taller.lugar}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold">
                        {pasado && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">Ya pasó</span>}
                        {!taller.activo && <span className="rounded-full bg-gray-800 px-2 py-0.5 text-white">Oculto</span>}
                        <span className={`rounded-full px-2 py-0.5 ${lleno ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'}`}>
                          {inscritos}{taller.cupo ? ` / ${taller.cupo}` : ''} inscritos
                        </span>
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">{taller.costo === null ? 'Gratuito' : `$${Number(taller.costo).toLocaleString('es-MX')}`}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => verInscritos(taller)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-green-600" title="Ver inscritos"><Users className="h-4 w-4" /></button>
                      <button onClick={() => abrirEdicion(taller)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-green-600" title="Editar"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => alternarEstado(taller)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-green-600" title={taller.activo ? 'Ocultar' : 'Mostrar'}>{taller.activo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      <button onClick={() => eliminar(taller)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {tallerInscritos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setTallerInscritos(null)}>
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Inscritos</h2>
                <p className="text-sm text-gray-500">{tallerInscritos.titulo}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={exportarInscritos} disabled={registros.length === 0} className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"><Download className="h-4 w-4" /> Excel</button>
                <button onClick={() => setTallerInscritos(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" title="Cerrar"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="overflow-y-auto">
              {cargandoRegistros ? (
                <div className="flex justify-center p-10"><Loader2 className="h-7 w-7 animate-spin text-green-600" /></div>
              ) : registros.length === 0 ? (
                <p className="p-8 text-center text-gray-600">Nadie se ha inscrito todavía.</p>
              ) : (
                <table className="tabla-tarjetas w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">WhatsApp</th><th className="px-4 py-3">Correo</th><th className="px-4 py-3" /></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {registros.map((registro, indice) => (
                      <tr key={registro.id}>
                        <td className="px-4 py-3 text-gray-400">{indice + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{registro.nombre}</td>
                        <td data-label="WhatsApp" className="px-4 py-3"><a href={`https://wa.me/52${registro.whatsapp.slice(-10)}`} target="_blank" rel="noreferrer" className="text-green-700 hover:underline">{registro.whatsapp}</a></td>
                        <td data-label="Correo" className="px-4 py-3 text-gray-600">{registro.correo || '—'}</td>
                        <td data-acciones className="px-4 py-3 text-right"><button onClick={() => eliminarRegistro(registro)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600" title="Quitar inscripción"><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
