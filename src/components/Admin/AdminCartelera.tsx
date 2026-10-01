import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { cargarCatalogos, cargarEdiciones } from '@/components/Cartelera/cartelera';
import type { Catalogo, Edicion } from '@/components/Cartelera/cartelera';
import { ParticipantesCartelera } from './Cartelera/ParticipantesCartelera';
import { CatalogosCartelera } from './Cartelera/CatalogosCartelera';
import { AjustesCartelera } from './Cartelera/AjustesCartelera';
import { NuevaEdicion } from './Cartelera/NuevaEdicion';

type Pestana = 'participantes' | 'catalogos' | 'ajustes';

const PESTANAS: { clave: Pestana; nombre: string }[] = [
  { clave: 'participantes', nombre: 'Actividades' },
  { clave: 'catalogos', nombre: 'Tipos y grupos' },
  { clave: 'ajustes', nombre: 'Edición' },
];

export default function AdminCartelera() {
  const [pestana, setPestana] = useState<Pestana>('participantes');
  const [catalogos, setCatalogos] = useState<{ tipos: Catalogo[]; grupos: Catalogo[] } | null>(null);
  // Cada año es una edición con sus propios participantes; los tipos y grupos se comparten
  const [ediciones, setEdiciones] = useState<Edicion[] | null>(null);
  const [edicionId, setEdicionId] = useState<string | null>(null);
  const [creandoEdicion, setCreandoEdicion] = useState(false);
  const [parametros] = useSearchParams();
  const anioEnlace = parametros.get('edicion');

  const recargarCatalogos = useCallback(() => {
    cargarCatalogos().then(setCatalogos);
  }, []);

  const recargarEdiciones = useCallback(async (seleccionar?: string) => {
    const lista = await cargarEdiciones();
    setEdiciones(lista);
    setEdicionId((actual) => {
      const deseada = seleccionar ?? actual;
      if (deseada && lista.some((edicion) => edicion.id === deseada)) return deseada;
      // Al llegar desde el Calendario (?edicion=2026) se abre esa edición
      const delEnlace = lista.find((edicion) => String(edicion.anio) === anioEnlace);
      if (delEnlace) return delEnlace.id;
      return (lista.find((edicion) => edicion.es_actual) ?? lista[0])?.id ?? null;
    });
  }, [anioEnlace]);

  useEffect(() => {
    recargarCatalogos();
    recargarEdiciones();
  }, [recargarCatalogos, recargarEdiciones]);

  const edicion = ediciones?.find((item) => item.id === edicionId) ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-2 sm:py-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 border-b border-[#4A2E18]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cartelera del festival</h1>
          <p className="mt-1 font-medium text-green-700">Actividades, horarios y archivos de cada edición del festival</p>
        </div>
        <a href={edicion && !edicion.es_actual ? `/cartelera?edicion=${edicion.anio}` : '/cartelera'} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
          <ExternalLink className="h-4 w-4" /> Ver cartelera
        </a>
      </div>

      {/* Selector de edición */}
      {ediciones === null ? (
        <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-green-600" /></div>
      ) : ediciones.length === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Aún no hay ediciones del festival. Si es la primera vez, corre <code className="rounded bg-white px-1">database/18_ediciones_festival.sql</code> en Supabase: convierte la cartelera actual en la primera edición.
        </p>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <label className="flex flex-1 flex-col gap-2 text-sm font-semibold text-gray-700 sm:flex-row sm:items-center">
            <span className="shrink-0">Edición:</span>
            <select value={edicionId ?? ''} onChange={(e) => setEdicionId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal focus:border-green-500 focus:outline-none sm:max-w-sm">
              {ediciones.map((item) => (
                <option key={item.id} value={item.id}>{item.anio} · {item.nombre}{item.es_actual ? ' (actual)' : ''}</option>
              ))}
            </select>
            {edicion && !edicion.es_actual && (
              <span className="w-fit shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">No es la actual</span>
            )}
          </label>
          <button onClick={() => setCreandoEdicion(true)} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700">
            <Plus className="h-4 w-4" /> Nueva edición
          </button>
        </div>
      )}

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

      {catalogos && ediciones !== null && pestana === 'participantes' && (
        <ParticipantesCartelera tipos={catalogos.tipos} grupos={catalogos.grupos} edicionId={edicionId} />
      )}
      {catalogos && pestana === 'catalogos' && (
        // key: reinicia los editores con los datos recién guardados
        <CatalogosCartelera key={JSON.stringify(catalogos)} tipos={catalogos.tipos} grupos={catalogos.grupos} onCambio={recargarCatalogos} />
      )}
      {pestana === 'ajustes' && edicion && (
        <AjustesCartelera
          edicion={edicion}
          onCambio={() => recargarEdiciones()}
          onEliminada={() => { setEdicionId(null); recargarEdiciones(); }}
        />
      )}

      {creandoEdicion && ediciones && (
        <NuevaEdicion
          ediciones={ediciones}
          onCerrar={() => setCreandoEdicion(false)}
          onCreada={async (nuevaId) => {
            setCreandoEdicion(false);
            await recargarEdiciones(nuevaId);
            setPestana('participantes');
          }}
        />
      )}
    </div>
  );
}
