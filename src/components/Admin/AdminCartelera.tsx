import { useCallback, useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { cargarCatalogos } from '@/components/Cartelera/cartelera';
import type { Catalogo } from '@/components/Cartelera/cartelera';
import { ParticipantesCartelera } from './Cartelera/ParticipantesCartelera';
import { CatalogosCartelera } from './Cartelera/CatalogosCartelera';
import { AjustesCartelera } from './Cartelera/AjustesCartelera';

type Pestana = 'participantes' | 'catalogos' | 'ajustes';

const PESTANAS: { clave: Pestana; nombre: string }[] = [
  { clave: 'participantes', nombre: 'Participantes' },
  { clave: 'catalogos', nombre: 'Tipos y grupos' },
  { clave: 'ajustes', nombre: 'Ajustes' },
];

export default function AdminCartelera() {
  const [pestana, setPestana] = useState<Pestana>('participantes');
  const [catalogos, setCatalogos] = useState<{ tipos: Catalogo[]; grupos: Catalogo[] } | null>(null);

  const recargarCatalogos = useCallback(() => {
    cargarCatalogos().then(setCatalogos);
  }, []);

  useEffect(() => {
    recargarCatalogos();
  }, [recargarCatalogos]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 border-b border-[#4A2E18]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cartelera del festival</h1>
          <p className="mt-1 font-medium text-green-700">Participantes, horarios y archivos del día del festival</p>
        </div>
        <a href="/cartelera" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
          <ExternalLink className="h-4 w-4" /> Ver cartelera
        </a>
      </div>

      <div role="tablist" className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {PESTANAS.map(({ clave, nombre }) => (
          <button
            key={clave}
            role="tab"
            aria-selected={pestana === clave}
            onClick={() => setPestana(clave)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${pestana === clave ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {nombre}
          </button>
        ))}
      </div>

      {catalogos && pestana === 'participantes' && <ParticipantesCartelera tipos={catalogos.tipos} grupos={catalogos.grupos} />}
      {catalogos && pestana === 'catalogos' && (
        // key: reinicia los editores con los datos recién guardados
        <CatalogosCartelera key={JSON.stringify(catalogos)} tipos={catalogos.tipos} grupos={catalogos.grupos} onCambio={recargarCatalogos} />
      )}
      {pestana === 'ajustes' && <AjustesCartelera />}
    </div>
  );
}
