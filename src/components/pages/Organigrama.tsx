import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CAMPOS_INTEGRANTE } from '@/components/Equipo/equipo';
import { OrganigramaView } from '@/components/Equipo/OrganigramaView';
import type { Integrante } from '@/components/Equipo/equipo';

export default function Organigrama() {
  const [integrantes, setIntegrantes] = useState<Integrante[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;

    supabase
      .from('directorio')
      .select(CAMPOS_INTEGRANTE)
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })
      .then(({ data, error }) => {
        if (!vigente) return;
        if (error) console.error('No se pudo cargar el directorio para el organigrama.', error);
        setIntegrantes((data || []) as Integrante[]);
        setCargando(false);
      });

    return () => { vigente = false; };
  }, []);

  return (
    <div className="min-h-screen bg-[#fcfaf2] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link to="/directorio" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#2d6a4f] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Volver al directorio
        </Link>
        {cargando ? (
          <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#2d6a4f]" /></div>
        ) : integrantes.length === 0 ? (
          <p className="py-16 text-center text-[#4a3728]/70">Muy pronto conocerás aquí la estructura del equipo FDMA.</p>
        ) : (
          <OrganigramaView integrantes={integrantes} />
        )}
      </div>
    </div>
  );
}

