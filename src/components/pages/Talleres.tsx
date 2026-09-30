import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TarjetaTaller } from '@/components/Talleres/TarjetaTaller';
import { CAMPOS_TALLER_PUBLICO } from '@/components/Talleres/talleres';
import type { TallerPublico } from '@/components/Talleres/talleres';
import { ModalRegistroTaller } from '@/components/Talleres/ModalRegistroTaller';

export default function Talleres() {
  const [talleres, setTalleres] = useState<TallerPublico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionado, setSeleccionado] = useState<TallerPublico | null>(null);

  const cargarTalleres = useCallback(() => supabase
    .from('talleres_publicos')
    .select(CAMPOS_TALLER_PUBLICO)
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true })
    .then(({ data, error }) => {
      if (!error) setTalleres((data || []) as TallerPublico[]);
      setCargando(false);
    }), []);

  useEffect(() => {
    cargarTalleres();
  }, [cargarTalleres]);

  return (
    <div className="min-h-screen bg-[#fcfaf2]">
      <section className="bg-gradient-to-b from-[#d8ece1] to-[#fcfaf2] px-6 pb-10 pt-12 text-center">
        <p className="mb-2 text-sm font-bold uppercase tracking-widest text-[#2d6a4f]">Comunidad y formación</p>
        <h1 className="mb-4 text-4xl font-extrabold text-[#4a3728] md:text-5xl">Talleres extraordinarios</h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-700">
          Actividades prácticas fuera del día del festival. Elige un taller, regístrate y aparta tu lugar.
        </p>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-8">
        {cargando ? (
          <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
        ) : talleres.length === 0 ? (
          <p className="py-12 text-center text-[#4a3728]/70">Por ahora no hay talleres programados. Síguenos en redes para enterarte de los próximos.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {talleres.map((taller) => (
              <TarjetaTaller key={taller.id} taller={taller} onRegistrarme={setSeleccionado} />
            ))}
          </div>
        )}
      </section>

      {seleccionado && (
        <ModalRegistroTaller taller={seleccionado} onCerrar={() => setSeleccionado(null)} onRegistrado={cargarTalleres} />
      )}
    </div>
  );
}
