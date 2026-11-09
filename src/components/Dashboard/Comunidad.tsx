import { useEffect, useState } from 'react';
import { MessageCircle, ArrowUpRight, Sparkles, Loader2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Comunidad() {
  // Cada colonia tiene su propio grupo (se configura en Admin → Colonias)
  const [cargando, setCargando] = useState(true);
  const [grupoWhatsapp, setGrupoWhatsapp] = useState<string | null>(null);
  const [nombreColonia, setNombreColonia] = useState('');

  useEffect(() => {
    const cargarGrupo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: usuario } = await supabase
          .from('usuarios')
          .select('colonias(nombre, whatsapp_url)')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        const colonia = (Array.isArray(usuario?.colonias) ? usuario.colonias[0] : usuario?.colonias) as
          { nombre?: string; whatsapp_url?: string | null } | null | undefined;

        setNombreColonia(colonia?.nombre || '');
        setGrupoWhatsapp(colonia?.whatsapp_url || null);
      } finally {
        setCargando(false);
      }
    };

    cargarGrupo();
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-2 sm:py-4">
      <div className="flex items-center gap-3 mb-8 border-b pb-4">
        <div className="bg-[#DFF3E5] rounded-full p-3 flex items-center justify-center shrink-0">
          <img src="/comunidad.svg" alt="Grupo de comunidad" className="h-12 w-12 object-contain" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight break-words">Comunidad</h1>
          <p className="text-lg sm:text-xl text-gray-500 mt-2">Conecta con otros ECO-GUARDIANES.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {cargando ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-green-200 bg-[#F4F9F1] p-10 text-gray-600">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
            Cargando grupo...
          </div>
        ) : grupoWhatsapp ? (
          <a
            href={grupoWhatsapp}
            target="_blank"
            rel="noreferrer"
            className="block rounded-2xl border border-green-200 bg-[#F4F9F1] p-6 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="shrink-0 bg-green-600 rounded-full p-3 text-white">
                  <MessageCircle className="h-7 w-7" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.2em] text-green-700 font-bold">WhatsApp</p>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                    {nombreColonia ? `Grupo de ${nombreColonia}` : 'Grupo de la comunidad'}
                  </h2>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-green-600 px-4 py-2 text-white font-semibold text-sm">
                Entrar
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-green-200 bg-white/70 p-4 text-sm text-gray-700">
              <div className="flex items-center gap-2 mb-2 text-green-800 font-semibold">
                <Sparkles className="h-4 w-4" />
                Comunidad Eco Guardianes
              </div>
              <p>
                Únete al grupo para compartir dudas, avisos, actividades y apoyo entre todas.
              </p>
            </div>
          </a>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 text-center sm:p-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <Clock className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Tu colonia aún no tiene grupo</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
              Cuando el equipo de Eco Guardianes cree el grupo de WhatsApp de{' '}
              {nombreColonia ? <strong>{nombreColonia}</strong> : 'tu colonia'}, aparecerá aquí para que puedas unirte.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
