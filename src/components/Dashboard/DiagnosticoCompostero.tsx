import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { Diagnostico, Tono } from '@/lib/bitacora';

const ESTILOS: Record<Tono, { caja: string; icono: string; Icono: typeof Info }> = {
  bien: { caja: 'border-green-600 bg-green-50', icono: 'text-green-700', Icono: CheckCircle2 },
  atencion: { caja: 'border-amber-500 bg-amber-50', icono: 'text-amber-600', Icono: Info },
  alerta: { caja: 'border-red-500 bg-red-50', icono: 'text-red-600', Icono: AlertTriangle },
};

export default function DiagnosticoCompostero({ diagnostico }: { diagnostico: Diagnostico }) {
  const { caja, icono, Icono } = ESTILOS[diagnostico.estado];

  return (
    <div className={`rounded-xl border-l-4 px-4 py-4 ${caja}`}>
      <p className="flex items-center gap-2 font-semibold text-gray-900">
        <Icono className={`h-5 w-5 shrink-0 ${icono}`} aria-hidden="true" />
        {diagnostico.titulo}
      </p>
      <ul className="mt-2 space-y-1.5 pl-7 text-sm text-gray-700">
        {diagnostico.consejos.map((consejo) => (
          <li key={consejo} className="list-disc">{consejo}</li>
        ))}
      </ul>
    </div>
  );
}
