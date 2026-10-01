import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { CheckCircle2, ExternalLink, FileText, Loader2, Save, Star, Trash2, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { borrarArchivos, subirArchivo } from '@/lib/storage';
import { BUCKET_IMAGENES, BUCKET_PDF } from '@/components/Cartelera/cartelera';
import type { Edicion } from '@/components/Cartelera/cartelera';

type CampoArchivo = 'cartelera_fondo_url' | 'cartelera_pdf_url' | 'croquis_pdf_url';

const ARCHIVOS: { campo: CampoArchivo; nombre: string; ayuda: string; bucket: string; accept: string }[] = [
  { campo: 'cartelera_fondo_url', nombre: 'Foto de fondo', ayuda: 'Horizontal, de preferencia 1920 px de ancho', bucket: BUCKET_IMAGENES, accept: 'image/jpeg,image/png,image/webp' },
  { campo: 'cartelera_pdf_url', nombre: 'Cartelera en PDF', ayuda: 'Botón "Descargar cartelera"', bucket: BUCKET_PDF, accept: 'application/pdf' },
  { campo: 'croquis_pdf_url', nombre: 'Croquis de stands en PDF', ayuda: 'Exportado desde AutoCAD', bucket: BUCKET_PDF, accept: 'application/pdf' },
];

interface Props {
  edicion: Edicion;
  onCambio: () => Promise<void>; // Recarga la lista de ediciones
  onEliminada: () => void;
}

// Nombre, archivos y estado de UNA edición del festival
export function AjustesCartelera({ edicion, onCambio, onEliminada }: Props) {
  const [nombre, setNombre] = useState(edicion.nombre);
  const [subiendo, setSubiendo] = useState<CampoArchivo | null>(null);
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [marcando, setMarcando] = useState(false);

  useEffect(() => {
    setNombre(edicion.nombre);
  }, [edicion.id, edicion.nombre]);

  async function guardarCampos(cambios: Partial<Edicion>) {
    const { error } = await supabase.from('festival_ediciones').update(cambios).eq('id', edicion.id);
    if (error) throw error;
    await onCambio();
  }

  async function guardarNombre() {
    if (!nombre.trim()) return;
    setGuardandoNombre(true);
    try {
      await guardarCampos({ nombre: nombre.trim() });
      toast.success('Nombre guardado.');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo guardar.');
    } finally {
      setGuardandoNombre(false);
    }
  }

  async function marcarComoActual() {
    if (!window.confirm(`¿Mostrar la edición ${edicion.anio} en la cartelera pública? La edición actual pasará a ser una edición anterior.`)) return;
    setMarcando(true);
    const { error } = await supabase.rpc('marcar_edicion_actual', { p_edicion: edicion.id });
    setMarcando(false);
    if (error) {
      console.error(error);
      toast.error('No se pudo cambiar la edición actual.');
      return;
    }
    toast.success(`La edición ${edicion.anio} ahora es la actual.`);
    await onCambio();
  }

  async function eliminarEdicion() {
    const confirmacion = window.prompt(
      `Se eliminará la edición ${edicion.anio} con TODOS sus participantes y horarios. Esta acción no se puede deshacer.\n\nEscribe ${edicion.anio} para confirmar:`,
    );
    if (confirmacion !== String(edicion.anio)) return;

    const { error } = await supabase.from('festival_ediciones').delete().eq('id', edicion.id);
    if (error) {
      console.error(error);
      toast.error('No se pudo eliminar la edición.');
      return;
    }
    await borrarArchivos(BUCKET_IMAGENES, [edicion.cartelera_fondo_url]);
    await borrarArchivos(BUCKET_PDF, [edicion.cartelera_pdf_url, edicion.croquis_pdf_url]);
    toast.success('Edición eliminada.');
    onEliminada();
  }

  async function reemplazarArchivo(campo: CampoArchivo, bucket: string, e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;

    setSubiendo(campo);
    let subida: { url: string } | null = null;
    try {
      subida = await subirArchivo(bucket, `festival/${edicion.anio}`, archivo);
      const anterior = edicion[campo];
      await guardarCampos({ [campo]: subida.url });
      await borrarArchivos(bucket, [anterior]);
      toast.success('Archivo actualizado.');
    } catch (err) {
      if (subida) await borrarArchivos(bucket, [subida.url]);
      console.error(err);
      toast.error('No se pudo subir el archivo.');
    } finally {
      setSubiendo(null);
    }
  }

  async function quitarArchivo(campo: CampoArchivo, bucket: string) {
    if (!edicion[campo] || !window.confirm('¿Quitar este archivo?')) return;
    const anterior = edicion[campo];
    try {
      await guardarCampos({ [campo]: null });
      await borrarArchivos(bucket, [anterior]);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo quitar el archivo.');
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-transparent bg-white shadow-sm">
        <CardHeader className="border-b bg-gray-50/50 px-6 py-4"><CardTitle className="text-lg text-gray-800">Edición {edicion.anio}</CardTitle></CardHeader>
        <CardContent className="space-y-5 p-6">
          {edicion.es_actual ? (
            <p className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              Es la edición actual: es la que se ve en la cartelera pública y en la página de inicio.
            </p>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 sm:flex-row sm:items-center sm:justify-between">
              <span>Edición anterior: se guarda como historial en <a href={`/cartelera?edicion=${edicion.anio}`} target="_blank" rel="noreferrer" className="font-semibold text-green-700 underline">/cartelera?edicion={edicion.anio}</a>.</span>
              <button onClick={marcarComoActual} disabled={marcando} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                {marcando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />} Marcar como actual
              </button>
            </div>
          )}

          <label className="block text-sm font-semibold text-gray-700">
            Nombre del festival
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={150} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 font-normal focus:border-green-500 focus:outline-none" />
              <button onClick={guardarNombre} disabled={guardandoNombre || nombre.trim() === edicion.nombre} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                {guardandoNombre ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
              </button>
            </div>
          </label>
        </CardContent>
      </Card>

      <Card className="border-transparent bg-white shadow-sm">
        <CardHeader className="border-b bg-gray-50/50 px-6 py-4"><CardTitle className="text-lg text-gray-800">Archivos de esta edición</CardTitle></CardHeader>
        <CardContent className="divide-y divide-gray-100 p-0">
          {ARCHIVOS.map(({ campo, nombre: nombreArchivo, ayuda, bucket, accept }) => {
            const url = edicion[campo];
            return (
              <div key={campo} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
                {campo === 'cartelera_fondo_url' && url
                  ? <img src={url} alt="" className="h-14 w-24 shrink-0 rounded-lg object-cover" />
                  : <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400"><FileText className="h-6 w-6" /></div>}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{nombreArchivo}</p>
                  <p className="text-sm text-gray-500">{url ? 'Cargado' : 'Sin archivo'} · {ayuda}</p>
                </div>
                <div className="flex items-center gap-2">
                  {url && <a href={url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-green-600" title="Ver"><ExternalLink className="h-4 w-4" /></a>}
                  {url && <button onClick={() => quitarArchivo(campo, bucket)} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-red-600">Quitar</button>}
                  <label className={`flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 ${subiendo ? 'pointer-events-none opacity-60' : ''}`}>
                    {subiendo === campo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {url ? 'Reemplazar' : 'Subir'}
                    <input type="file" accept={accept} onChange={(e) => reemplazarArchivo(campo, bucket, e)} className="hidden" />
                  </label>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {!edicion.es_actual && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
          <span>Eliminar esta edición borra también sus participantes y horarios.</span>
          <button onClick={eliminarEdicion} className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 font-semibold text-red-700 hover:bg-red-100">
            <Trash2 className="h-4 w-4" /> Eliminar edición {edicion.anio}
          </button>
        </div>
      )}
    </div>
  );
}
