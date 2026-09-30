import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ExternalLink, FileText, Loader2, Save, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { borrarArchivos, subirArchivo } from '@/lib/storage';
import { BUCKET_IMAGENES, BUCKET_PDF } from '@/components/Cartelera/cartelera';
import type { AjustesCartelera as Ajustes } from '@/components/Cartelera/cartelera';

type CampoArchivo = 'cartelera_fondo_url' | 'cartelera_pdf_url' | 'croquis_pdf_url';

const ARCHIVOS: { campo: CampoArchivo; nombre: string; ayuda: string; bucket: string; accept: string }[] = [
  { campo: 'cartelera_fondo_url', nombre: 'Foto de fondo', ayuda: 'Horizontal, de preferencia 1920 px de ancho', bucket: BUCKET_IMAGENES, accept: 'image/jpeg,image/png,image/webp' },
  { campo: 'cartelera_pdf_url', nombre: 'Cartelera en PDF', ayuda: 'Botón "Descargar cartelera"', bucket: BUCKET_PDF, accept: 'application/pdf' },
  { campo: 'croquis_pdf_url', nombre: 'Croquis de stands en PDF', ayuda: 'Exportado desde AutoCAD', bucket: BUCKET_PDF, accept: 'application/pdf' },
];

export function AjustesCartelera() {
  const [ajustes, setAjustes] = useState<Ajustes | null>(null);
  const [subiendo, setSubiendo] = useState<CampoArchivo | null>(null);
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  useEffect(() => {
    supabase
      .from('pagina_inicio')
      .select('festival_nombre, cartelera_fondo_url, cartelera_pdf_url, croquis_pdf_url')
      .eq('id', 1)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          toast.error('No se pudieron cargar los ajustes. ¿Ya corriste 12_cartelera.sql?');
          return;
        }
        setAjustes(data as Ajustes);
      });
  }, []);

  async function guardarCampos(cambios: Partial<Ajustes>) {
    const { error } = await supabase.from('pagina_inicio').update({ ...cambios, updated_at: new Date().toISOString() }).eq('id', 1);
    if (error) throw error;
    setAjustes((actual) => actual && { ...actual, ...cambios });
  }

  async function guardarNombre() {
    if (!ajustes?.festival_nombre.trim()) return;
    setGuardandoNombre(true);
    try {
      await guardarCampos({ festival_nombre: ajustes.festival_nombre.trim() });
      toast.success('Nombre guardado.');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo guardar.');
    } finally {
      setGuardandoNombre(false);
    }
  }

  async function reemplazarArchivo(campo: CampoArchivo, bucket: string, e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo || !ajustes) return;

    setSubiendo(campo);
    let subida: { url: string } | null = null;
    try {
      subida = await subirArchivo(bucket, 'festival', archivo);
      const anterior = ajustes[campo];
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
    if (!ajustes?.[campo] || !window.confirm('¿Quitar este archivo?')) return;
    const anterior = ajustes[campo];
    try {
      await guardarCampos({ [campo]: null });
      await borrarArchivos(bucket, [anterior]);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo quitar el archivo.');
    }
  }

  if (!ajustes) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-transparent bg-white shadow-sm">
        <CardHeader className="border-b bg-gray-50/50 px-6 py-4"><CardTitle className="text-lg text-gray-800">Nombre del festival</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row">
          <input value={ajustes.festival_nombre} onChange={(e) => setAjustes({ ...ajustes, festival_nombre: e.target.value })} maxLength={100} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" />
          <button onClick={guardarNombre} disabled={guardandoNombre} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
            {guardandoNombre ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
          </button>
        </CardContent>
      </Card>

      <Card className="border-transparent bg-white shadow-sm">
        <CardHeader className="border-b bg-gray-50/50 px-6 py-4"><CardTitle className="text-lg text-gray-800">Archivos</CardTitle></CardHeader>
        <CardContent className="divide-y divide-gray-100 p-0">
          {ARCHIVOS.map(({ campo, nombre, ayuda, bucket, accept }) => {
            const url = ajustes[campo];
            return (
              <div key={campo} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
                {campo === 'cartelera_fondo_url' && url
                  ? <img src={url} alt="" className="h-14 w-24 shrink-0 rounded-lg object-cover" />
                  : <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400"><FileText className="h-6 w-6" /></div>}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{nombre}</p>
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
    </div>
  );
}
