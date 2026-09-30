import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import '../Landing/Landing.css';

// Página que abre la persona que administra el Facebook de FDMA, con el enlace
// de un solo uso que genera el Super Admin en Admin → Publicaciones.
// Autoriza una vez con su Facebook y las publicaciones llegan solas a la página.

const PERMISOS = 'pages_show_list,pages_read_engagement,instagram_basic,business_management';

type Estado = 'validando' | 'listo' | 'conectando' | 'exito' | 'error';

const MENSAJES_ERROR: Record<string, string> = {
  ENLACE_INVALIDO: 'Este enlace ya se usó o ya venció. Pide uno nuevo a quien te lo mandó.',
  SIN_PAGINAS: 'Tu cuenta de Facebook no administra ninguna Página. Inicia sesión con la cuenta que administra la Página de FDMA.',
  VARIAS_PAGINAS: 'Tu cuenta administra varias Páginas. Avisa a quien te mandó el enlace para que indique cuál es la de FDMA.',
  CANCELADO: 'Se canceló la autorización en Facebook. Puedes intentarlo de nuevo con el mismo enlace.',
};

export default function ConectarRedes() {
  const [params, setParams] = useSearchParams();
  const [estado, setEstado] = useState<Estado>('validando');
  const [mensajeError, setMensajeError] = useState('');
  const [conectadoA, setConectadoA] = useState('');
  const yaProcesado = useRef(false);

  const codigo = params.get('c') || params.get('state') || '';
  const redirectUri = `${window.location.origin}/conectar-redes`;

  useEffect(() => {
    // StrictMode ejecuta el efecto dos veces; el "code" de Facebook solo sirve una vez
    if (yaProcesado.current) return;
    yaProcesado.current = true;

    const mostrarError = (clave: string) => {
      setMensajeError(MENSAJES_ERROR[clave] || 'No se pudo completar la conexión. Intenta de nuevo más tarde.');
      setEstado('error');
    };

    const procesar = async () => {
      if (!codigo) {
        mostrarError('ENLACE_INVALIDO');
        return;
      }

      // Regreso desde Facebook
      if (params.get('error')) {
        setParams({ c: codigo }, { replace: true });
        mostrarError('CANCELADO');
        return;
      }

      const code = params.get('code');
      if (code) {
        setEstado('conectando');
        setParams({}, { replace: true }); // Quita el code de la barra de direcciones

        const { data, error } = await supabase.functions.invoke('meta-conectar', {
          body: { codigo, code, redirect_uri: redirectUri },
        });

        if (error) {
          const cuerpo = await (error as { context?: Response }).context?.json?.().catch(() => null);
          console.error(error, cuerpo);
          mostrarError(cuerpo?.error ?? '');
          return;
        }

        const resultado = data as { page_nombre: string; ig_usuario: string | null };
        setConectadoA(resultado.ig_usuario ? `${resultado.page_nombre} y @${resultado.ig_usuario}` : resultado.page_nombre);
        setEstado('exito');
        return;
      }

      // Primera visita con ?c=CODIGO
      const { data: vigente } = await supabase.rpc('validar_enlace_conexion_redes', { p_codigo: codigo });
      if (vigente) setEstado('listo');
      else mostrarError('ENLACE_INVALIDO');
    };

    procesar();
  }, []);

  const conectarConFacebook = () => {
    const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
    url.searchParams.set('client_id', import.meta.env.VITE_META_APP_ID);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', codigo);
    url.searchParams.set('response_type', 'code');
    // Con "Facebook Login for Business" los permisos vienen de una configuración de la app
    const configId = import.meta.env.VITE_META_CONFIG_ID;
    if (configId) url.searchParams.set('config_id', configId);
    else url.searchParams.set('scope', PERMISOS);
    window.location.href = url.toString();
  };

  return (
    <div className="landing-page flex flex-col items-center px-4 pt-10 pb-16 sm:pt-16">
      <div className="w-full max-w-md rounded-3xl border border-[#4A2E18]/10 bg-white p-6 text-center shadow-lg sm:p-8">
        <img src="/logo_fdma.svg" alt="FDMA" className="mx-auto mb-4 h-20 w-20 object-contain mix-blend-multiply" />

        {(estado === 'validando' || estado === 'conectando') && (
          <div className="flex flex-col items-center gap-3 py-6 text-[#4A2E18]/80">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <p className="font-medium">{estado === 'validando' ? 'Revisando el enlace...' : 'Conectando con Facebook e Instagram...'}</p>
          </div>
        )}

        {estado === 'listo' && (
          <>
            <h1 className="mb-3 text-2xl font-bold text-[#4A2E18]">Conecta las redes de FDMA</h1>
            <p className="mb-5 text-[#4A2E18]/80">
              Al autorizar, las publicaciones de la Página de Facebook y del Instagram de FDMA aparecerán solas en la página del festival.
            </p>
            <ul className="mb-6 space-y-2 text-left text-sm text-[#4A2E18]/80">
              <li className="flex gap-2"><ShieldCheck className="h-5 w-5 shrink-0 text-green-600" /> Solo se leen las publicaciones. No se publica nada ni se ven mensajes.</li>
              <li className="flex gap-2"><ShieldCheck className="h-5 w-5 shrink-0 text-green-600" /> No compartes tu contraseña con nadie: inicias sesión directo en Facebook.</li>
              <li className="flex gap-2"><ShieldCheck className="h-5 w-5 shrink-0 text-green-600" /> Puedes quitar el permiso cuando quieras desde la configuración de Facebook.</li>
            </ul>
            <button
              type="button"
              onClick={conectarConFacebook}
              className="w-full rounded-full bg-[#1877F2] px-6 py-3 font-bold text-white shadow-md transition hover:brightness-95"
            >
              Conectar con Facebook
            </button>
            <p className="mt-3 text-xs text-[#4A2E18]/60">Inicia sesión con la cuenta que administra la Página de FDMA.</p>
          </>
        )}

        {estado === 'exito' && (
          <div className="py-4">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-600" />
            <h1 className="mb-2 text-2xl font-bold text-[#4A2E18]">¡Listo, gracias!</h1>
            <p className="text-[#4A2E18]/80">
              Quedó conectado <strong>{conectadoA}</strong>. Las publicaciones aparecerán solas en la página. Ya puedes cerrar esta ventana.
            </p>
            <Link to="/" className="mt-6 inline-block font-bold text-green-700 hover:underline">Ver la página de FDMA</Link>
          </div>
        )}

        {estado === 'error' && (
          <div className="py-4">
            <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-amber-500" />
            <h1 className="mb-2 text-2xl font-bold text-[#4A2E18]">No se pudo conectar</h1>
            <p className="text-[#4A2E18]/80">{mensajeError}</p>
            {mensajeError === MENSAJES_ERROR.CANCELADO && (
              <button
                type="button"
                onClick={conectarConFacebook}
                className="mt-6 w-full rounded-full bg-[#1877F2] px-6 py-3 font-bold text-white shadow-md transition hover:brightness-95"
              >
                Intentar de nuevo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
