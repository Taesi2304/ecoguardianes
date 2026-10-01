import type { ReactNode } from 'react';
import { AlertTriangle, Bug } from 'lucide-react';
import {
  OPCIONES_HUMEDAD,
  OPCIONES_OLOR,
  OPCIONES_TEMPERATURA,
  diagnosticarVisita,
  etiquetaDe,
  faunaDe,
  residuosDe,
  type VisitaBitacora,
} from '@/lib/bitacora';
import DiagnosticoCompostero from './DiagnosticoCompostero';

function Etiqueta({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{children}</p>;
}

function Chips({ valores }: { valores: string[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {valores.map((valor) => (
        <span key={valor} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">{valor}</span>
      ))}
    </div>
  );
}

// Cuerpo de una tarjeta de historial; lo comparten el historial de la Eco Guardiana y el del admin
export default function DetalleVisita({ visita, onVerFoto }: { visita: VisitaBitacora; onVerFoto: (url: string) => void }) {
  const diagnostico = diagnosticarVisita(visita);
  const residuos = residuosDe(visita);
  const fauna = faunaDe(visita);
  const fotos = (visita.evidencias || []).map((e) => e.url_publica).filter((url): url is string => !!url);

  const estado = [
    { icono: '/sol.svg', titulo: 'Temperatura', valor: etiquetaDe(OPCIONES_TEMPERATURA, visita.temperatura_nivel) },
    { icono: '/gota-agua.svg', titulo: 'Humedad', valor: etiquetaDe(OPCIONES_HUMEDAD, visita.humedad_nivel) },
    { icono: '/hoja.svg', titulo: 'Olor', valor: etiquetaDe(OPCIONES_OLOR, visita.olor_nivel) },
  ].filter((dato) => dato.valor);

  return (
    <div className="space-y-4">
      {(diagnostico || visita.plagas || visita.lixiviados) && (
        <div className="flex flex-wrap gap-2">
          {diagnostico && <DiagnosticoCompostero diagnostico={diagnostico} compacto />}
          {visita.plagas && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
              <Bug className="h-3.5 w-3.5" aria-hidden="true" /> Plagas
            </span>
          )}
          {visita.lixiviados && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Lixiviados
            </span>
          )}
        </div>
      )}

      {estado.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {estado.map((dato) => (
            <div key={dato.titulo} className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2">
              <img src={dato.icono} alt="" aria-hidden="true" className="h-7 w-7 shrink-0 object-contain" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{dato.titulo}</p>
                <p className="text-sm font-semibold text-gray-800">{dato.valor}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {(residuos.length > 0 || fauna.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {residuos.length > 0 && (
            <div>
              <Etiqueta>Residuos</Etiqueta>
              <Chips valores={residuos} />
            </div>
          )}
          {fauna.length > 0 && (
            <div>
              <Etiqueta>Vida observada</Etiqueta>
              <Chips valores={fauna} />
            </div>
          )}
        </div>
      )}

      {visita.observaciones && (
        <div>
          <Etiqueta>Observaciones</Etiqueta>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{visita.observaciones}</p>
        </div>
      )}

      {visita.propuesta_mejora && (
        <div className="rounded-lg border border-[#4A2E18]/10 bg-[#F9F5E8] px-3 py-2.5">
          <Etiqueta>Propuesta de mejora</Etiqueta>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{visita.propuesta_mejora}</p>
        </div>
      )}

      {fotos.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {fotos.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => onVerFoto(url)}
              className="group overflow-hidden rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              aria-label="Ver evidencia en tamaño completo"
            >
              <img src={url} alt="Evidencia del compostero" loading="lazy" className="h-20 w-20 object-cover transition-transform duration-200 group-hover:scale-105 sm:h-24 sm:w-24" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
