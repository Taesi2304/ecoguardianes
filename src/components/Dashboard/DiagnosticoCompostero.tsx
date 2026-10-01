import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { Diagnostico, Tono } from '@/lib/bitacora';

const ESTILOS: Record<Tono, { caja: string; icono: string; insignia: string; Icono: typeof Info }> = {
  bien: { caja: 'border-green-600 bg-green-50', icono: 'text-green-700', insignia: 'border-green-200 bg-green-50 text-green-800', Icono: CheckCircle2 },
  atencion: { caja: 'border-amber-500 bg-amber-50', icono: 'text-amber-600', insignia: 'border-amber-200 bg-amber-50 text-amber-800', Icono: Info },
  alerta: { caja: 'border-red-500 bg-red-50', icono: 'text-red-600', insignia: 'border-red-200 bg-red-50 text-red-700', Icono: AlertTriangle },
};

export default function DiagnosticoCompostero({ diagnostico, compacto = false }: { diagnostico: Diagnostico; compacto?: boolean }) {
  const { caja, icono, insignia, Icono } = ESTILOS[diagnostico.estado];

  if (compacto) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${insignia}`}>
        <Icono className="h-3.5 w-3.5" aria-hidden="true" />
        {diagnostico.titulo}
      </span>
    );
  }

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
