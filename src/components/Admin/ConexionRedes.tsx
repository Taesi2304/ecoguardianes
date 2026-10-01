import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Link2, Loader2, MessageCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Conexión automática con Facebook e Instagram de FDMA.
// FDMA autoriza una sola vez con el enlace que se genera aquí (ver /conectar-redes).

interface EstadoConexion {
  conectado: boolean;
  page_nombre: string | null;
  ig_usuario: string | null;
  conectado_en: string | null;
  ultima_sincronizacion: string | null;
  ultimo_error: string | null;
}

const formatearFechaHora = (fecha: string) =>
  new Date(fecha).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

export default function ConexionRedes({ onSincronizado }: { onSincronizado: () => void }) {
  const [estado, setEstado] = useState<EstadoConexion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [sinConfigurar, setSinConfigurar] = useState(false);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    cargarEstado();
  }, []);

  async function cargarEstado() {
    const { data, error } = await supabase.rpc('estado_conexion_redes');
    if (error) {
      // La función no existe si aún no se corre database/15_redes_automaticas.sql
      console.error(error);
      setSinConfigurar(true);
    } else {
      setEstado(data as EstadoConexion | null);
    }
    setCargando(false);
  }

  async function generarEnlace() {
    setGenerando(true);
    const { data, error } = await supabase.rpc('crear_enlace_conexion_redes');
    setGenerando(false);

    if (error || !data) {
      console.error(error);
      toast.error('No se pudo generar el enlace.');
      return;
    }
    setEnlace(`${window.location.origin}/conectar-redes?c=${data}`);
  }

  async function copiarEnlace() {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace);
      toast.success('Enlace copiado.');
    } catch {
      toast.error('No se pudo copiar. Selecciona el enlace y cópialo a mano.');
    }
  }

  async function sincronizarAhora() {
    setSincronizando(true);
    const { data, error } = await supabase.functions.invoke('sincronizar-redes', { body: {} });
    setSincronizando(false);

    if (error) {
      console.error(error);
      toast.error('No se pudo sincronizar.');
    } else {
      const nuevas = (data as { nuevas?: number })?.nuevas ?? 0;
      toast.success(nuevas === 0 ? 'Todo al día: no hay publicaciones nuevas.' : `${nuevas} publicación(es) nueva(s).`);
      onSincronizado();
    }
    await cargarEstado();
  }

  const conexionPerdida = !!estado?.ultimo_error?.startsWith('CONEXION_PERDIDA');
  const conectado = !!estado?.conectado && !conexionPerdida;
  const mensajeWhatsapp = `Hola, para que las publicaciones de Facebook e Instagram de FDMA aparezcan solas en la página, abre este enlace y autoriza con tu Facebook (solo se hace una vez, vence en 48 horas): ${enlace}`;

  return (
    <Card className="border-transparent bg-white shadow-sm">
      <CardHeader className="border-b bg-gray-50/50 px-6 py-4">
        <CardTitle className="text-lg text-gray-800">Publicaciones automáticas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {cargando ? (
          <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-green-600" /></div>
        ) : sinConfigurar ? (
          <p className="text-sm text-gray-600">
            La conexión automática aún no está configurada. Falta correr <code className="rounded bg-gray-100 px-1">database/15_redes_automaticas.sql</code> en Supabase.
          </p>
        ) : (
          <>
            {conectado ? (
              <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                <div className="min-w-0">
                  <p className="font-semibold">
                    Conectado a {estado?.page_nombre || 'la Página de FDMA'}
                    {estado?.ig_usuario && <> y a @{estado.ig_usuario}</>}
                  </p>
                  <p className="mt-1 text-green-800">
                    Las publicaciones nuevas llegan solas cada 6 horas.
                    {estado?.ultima_sincronizacion && <> Última revisión: {formatearFechaHora(estado.ultima_sincronizacion)}.</>}
                  </p>
                  {!estado?.ig_usuario && (
                    <p className="mt-1 text-amber-700">El Instagram no está vinculado a la Página, así que solo se traen publicaciones de Facebook.</p>
                  )}
                  {estado?.ultimo_error && (
                    <p className="mt-1 break-words text-amber-700">Algunas publicaciones no se pudieron importar: {estado.ultimo_error}</p>
                  )}
                </div>
              </div>
            ) : conexionPerdida ? (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  <strong>Conexión perdida.</strong> FDMA cambió su contraseña o quitó el permiso. Genera un enlace nuevo y pídele a FDMA que vuelva a autorizar.
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  Aún no está conectado. Genera un enlace y mándaselo a la persona que administra las redes de FDMA: lo abre, autoriza y listo. No necesita darte su contraseña.
                </p>
                <p className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-xs">
                  <img src="/ig-icon.svg" alt="" className="h-4 w-4 shrink-0" />
                  <span>
                    Con una sola autorización se conectan <strong>Facebook e Instagram</strong>: Meta entrega el Instagram a través de la Página de Facebook a la que está vinculado. Por eso el botón dice "Conectar con Facebook".
                  </span>
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={generarEnlace}
                disabled={generando}
                className="flex items-center justify-center gap-2 rounded-xl border border-green-600 bg-white px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
              >
                {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                {conectado ? 'Generar enlace nuevo' : 'Generar enlace para FDMA'}
              </button>
              {conectado && (
                <button
                  type="button"
                  onClick={sincronizarAhora}
                  disabled={sincronizando}
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`} />
                  {sincronizando ? 'Sincronizando...' : 'Sincronizar ahora'}
                </button>
              )}
            </div>

            {enlace && (
              <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Enlace de un solo uso · vence en 48 horas</p>
                <p className="break-all rounded-lg bg-white p-3 font-mono text-xs text-gray-800">{enlace}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={copiarEnlace} className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
                    <Copy className="h-4 w-4" /> Copiar enlace
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(mensajeWhatsapp)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-white hover:brightness-95"
                  >
                    <MessageCircle className="h-4 w-4" /> Mandar por WhatsApp
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
