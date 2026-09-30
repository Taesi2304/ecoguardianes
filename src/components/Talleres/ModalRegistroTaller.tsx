import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, CheckCircle2, Loader2, MessageCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { enlaceGoogleCalendar, formatearFecha, formatearHora } from '@/lib/utils';
import type { TallerPublico } from './talleres';

interface Props {
  taller: TallerPublico;
  onCerrar: () => void;
  onRegistrado: () => void;
}

const MENSAJES_ERROR: Record<string, string> = {
  CUPO_AGOTADO: 'Lo sentimos, el cupo de este taller se acaba de agotar.',
  YA_REGISTRADO: 'Este número de WhatsApp ya está registrado en este taller.',
  TALLER_NO_DISPONIBLE: 'Este taller ya no está disponible.',
  DATOS_INVALIDOS: 'Revisa tu nombre y que el WhatsApp tenga 10 dígitos.',
};

const claseInput = 'mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-green-500 focus:outline-none';

export function ModalRegistroTaller({ taller, onCerrar, onRegistrado }: Props) {
  const [datos, setDatos] = useState({ nombre: '', whatsapp: '', correo: '' });
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<{ whatsapp_url: string | null } | null>(null);

  function manejarCambio(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setDatos((actual) => ({ ...actual, [name]: value }));
  }

  async function registrar(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (datos.whatsapp.replace(/\D/g, '').length < 10) {
      setError(MENSAJES_ERROR.DATOS_INVALIDOS);
      return;
    }

    setEnviando(true);
    const { data, error: errorRegistro } = await supabase.rpc('registrar_taller', {
      p_taller_id: taller.id,
      p_nombre: datos.nombre,
      p_whatsapp: datos.whatsapp,
      p_correo: datos.correo || null,
    });
    setEnviando(false);

    if (errorRegistro) {
      const codigo = Object.keys(MENSAJES_ERROR).find((clave) => errorRegistro.message.includes(clave));
      setError(codigo ? MENSAJES_ERROR[codigo] : 'No se pudo completar el registro. Intenta de nuevo.');
      if (codigo === 'CUPO_AGOTADO' || codigo === 'TALLER_NO_DISPONIBLE') onRegistrado();
      return;
    }

    const resultado = data as { registro_id: string; whatsapp_url: string | null };
    // El aviso por correo a FDMA no debe impedir la confirmación si falla
    supabase.functions.invoke('aviso-registro-taller', { body: { registro_id: resultado.registro_id } }).catch(console.error);
    setConfirmacion({ whatsapp_url: resultado.whatsapp_url });
    onRegistrado();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-registro" className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div>
            <h2 id="titulo-registro" className="text-lg font-bold text-[#4a3728]">{confirmacion ? '¡Registro confirmado!' : 'Registro al taller'}</h2>
            <p className="text-sm text-[#4a3728]/70">{taller.titulo}</p>
          </div>
          <button onClick={onCerrar} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>

        {confirmacion ? (
          <div className="space-y-5 p-5">
            <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4 text-green-800">
              <CheckCircle2 className="h-8 w-8 shrink-0" />
              <p className="text-sm">Gracias, <strong>{datos.nombre.trim().split(' ')[0]}</strong>. Tu lugar está apartado. Toma captura de esta pantalla como comprobante.</p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="font-semibold text-[#4a3728]/60">Fecha</dt><dd className="text-[#4a3728]">{formatearFecha(taller.fecha)}</dd>
              <dt className="font-semibold text-[#4a3728]/60">Hora</dt><dd className="text-[#4a3728]">{formatearHora(taller.hora_inicio)}{taller.hora_fin ? ` – ${formatearHora(taller.hora_fin)}` : ''}</dd>
              <dt className="font-semibold text-[#4a3728]/60">Lugar</dt><dd className="text-[#4a3728]">{taller.lugar}</dd>
              {taller.facilitador && <><dt className="font-semibold text-[#4a3728]/60">Imparte</dt><dd className="text-[#4a3728]">{taller.facilitador}</dd></>}
            </dl>
            <div className="space-y-2">
              {confirmacion.whatsapp_url && (
                <a href={confirmacion.whatsapp_url} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white hover:brightness-95">
                  <MessageCircle className="h-5 w-5" /> Unirme al grupo de WhatsApp
                </a>
              )}
              <a href={enlaceGoogleCalendar(taller)} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-[#4a3728] hover:bg-gray-50">
                <CalendarPlus className="h-5 w-5" /> Agregar a mi calendario
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={registrar} className="space-y-4 p-5">
            <label className="block text-sm font-semibold text-gray-700">Nombre completo
              <input name="nombre" value={datos.nombre} onChange={manejarCambio} autoComplete="name" minLength={3} maxLength={150} className={claseInput} required />
            </label>
            <label className="block text-sm font-semibold text-gray-700">WhatsApp
              <input name="whatsapp" type="tel" inputMode="numeric" value={datos.whatsapp} onChange={manejarCambio} autoComplete="tel" placeholder="10 dígitos" maxLength={15} className={claseInput} required />
            </label>
            <label className="block text-sm font-semibold text-gray-700">Correo (Opcional)
              <input name="correo" type="email" value={datos.correo} onChange={manejarCambio} autoComplete="email" maxLength={150} className={claseInput} />
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={aceptaPrivacidad} onChange={(e) => setAceptaPrivacidad(e.target.checked)} className="mt-1 h-4 w-4 accent-green-600" required />
              <span>Acepto el <Link to="/aviso-privacidad" target="_blank" className="font-semibold text-green-700 underline">aviso de privacidad</Link> y que FDMA me contacte por WhatsApp sobre este taller.</span>
            </label>

            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <button type="submit" disabled={enviando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">
              {enviando ? <><Loader2 className="h-5 w-5 animate-spin" /> Registrando...</> : 'Confirmar registro'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
