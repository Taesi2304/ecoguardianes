import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, Map as MapIcon, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CAMPOS_PARTICIPANTE, cargarCatalogos, cargarEdicion } from './cartelera';
import type { Catalogo, Edicion, Participante } from './cartelera';
import { TarjetaParticipante } from './TarjetaParticipante';
import { DetalleParticipante } from './DetalleParticipante';
import { Bienvenida } from './Bienvenida';

// Mientras FDMA no suba su propia foto en Admin → Cartelera → Ajustes
const FONDO_POR_DEFECTO = '/galeria/foto3.jpeg';

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function CarteleraPage() {
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [tipos, setTipos] = useState<Catalogo[]>([]);
  const [grupos, setGrupos] = useState<Catalogo[]>([]);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [tipoId, setTipoId] = useState<string | null>(null);
  const [grupoId, setGrupoId] = useState<string | null>(null);
  // ?p=<id> permite compartir el enlace a un participante; ?edicion=2026 muestra una edición anterior
  const [parametros, setParametros] = useSearchParams();
  const seleccionadoId = parametros.get('p');
  const anioEdicion = Number(parametros.get('edicion')) || undefined;

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      const [edicionCargada, catalogos] = await Promise.all([cargarEdicion(anioEdicion), cargarCatalogos()]);

      let consulta = supabase
        .from('cartelera_participantes')
        .select(CAMPOS_PARTICIPANTE)
        .eq('activo', true)
        .order('nombre', { ascending: true });
      if (edicionCargada) consulta = consulta.eq('edicion_id', edicionCargada.id);

      const { data } = await consulta;
      setParticipantes((data || []) as Participante[]);
      setTipos(catalogos.tipos);
      setGrupos(catalogos.grupos);
      setEdicion(edicionCargada);
      setCargando(false);
    };

    cargar();
  }, [anioEdicion]);

  const tiposPorId = useMemo(() => Object.fromEntries(tipos.map((tipo) => [tipo.id, tipo])), [tipos]);

  // Solo se muestran como filtro los tipos que tienen participantes
  const tiposConParticipantes = tipos.filter((tipo) => participantes.some((participante) => participante.tipo_id === tipo.id));

  const filtrados = useMemo(() => {
    const termino = normalizar(busqueda.trim());
    return participantes.filter((participante) => {
      if (tipoId && participante.tipo_id !== tipoId) return false;
      if (grupoId && participante.grupo_id !== grupoId) return false;
      if (!termino) return true;
      const texto = [participante.nombre, participante.subtitulo, participante.procedencia, ...participante.cartelera_horarios.map((horario) => horario.sede)]
        .filter(Boolean)
        .join(' ');
      return normalizar(texto).includes(termino);
    });
  }, [participantes, busqueda, tipoId, grupoId]);

  const carteleraVacia = !cargando && participantes.length === 0;
  const seleccionado = participantes.find((participante) => participante.id === seleccionadoId);
  // En escritorio siempre hay uno a la vista; en celular solo si se tocó
  const enEscritorio = seleccionado ?? filtrados[0];

  function seleccionar(id: string | null) {
    setParametros({ ...(anioEdicion ? { edicion: String(anioEdicion) } : {}), ...(id ? { p: id } : {}) }, { replace: true });
  }

  // La barra inferior pone "Todos" al centro, como "Inicio" en la referencia; solo grupos con participantes
  const gruposConParticipantes = grupos.filter((grupo) => participantes.some((participante) => participante.grupo_id === grupo.id));
  const mitad = Math.ceil(gruposConParticipantes.length / 2);
  const barra: (Catalogo | null)[] = [...gruposConParticipantes.slice(0, mitad), null, ...gruposConParticipantes.slice(mitad)];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#12261d] font-sans text-white">
      {!cargando && (
        <img src={edicion?.cartelera_fondo_url || FONDO_POR_DEFECTO} alt="" aria-hidden="true" className="fixed inset-0 h-full w-full object-cover" />
      )}
      {/* Velo verde bosque: deja ver la foto sin perder legibilidad */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0c1f16]/80 via-[#0c1f16]/45 to-[#0c1f16]/75" aria-hidden="true" />

      <div className="relative z-10 flex h-screen flex-col px-4 pb-28 pt-4 lg:px-8">
        <header className="mb-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-2 text-sm text-white/80 backdrop-blur hover:text-white">
            <ArrowLeft className="h-4 w-4" /> FDMA
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-center text-xs font-medium uppercase tracking-[0.2em] text-white/80 sm:text-sm">{edicion?.nombre ?? 'Cartelera'}</h1>
          <div className="flex gap-2">
            {edicion?.cartelera_pdf_url && (
              <a href={edicion.cartelera_pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-2 text-sm text-white/80 backdrop-blur hover:text-white" title="Descargar cartelera en PDF">
                <Download className="h-4 w-4" /><span className="hidden sm:inline">Cartelera PDF</span>
              </a>
            )}
            {edicion?.croquis_pdf_url && (
              <a href={edicion.croquis_pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-2 text-sm text-white/80 backdrop-blur hover:text-white" title="Croquis de stands">
                <MapIcon className="h-4 w-4" /><span className="hidden sm:inline">Croquis</span>
              </a>
            )}
          </div>
        </header>

        {edicion && !edicion.es_actual && (
          <div className="mb-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl bg-black/40 px-4 py-2 text-center text-sm text-white/85 backdrop-blur">
            <span>Estás viendo la edición {edicion.anio} del festival.</span>
            <Link to="/cartelera" className="font-semibold text-white underline hover:no-underline">Ver la edición actual</Link>
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(360px,40%)_1fr]">
          {/* Panel izquierdo: búsqueda, filtros y lista */}
          {/* Con la cartelera vacía, en celular se muestra la bienvenida en lugar de una lista vacía */}
          <section className={`min-h-0 min-w-0 flex-col rounded-2xl bg-[#10241b]/70 p-6 backdrop-blur-md ${carteleraVacia ? 'hidden lg:flex' : 'flex'}`}>
            <label className="mb-5 block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-white/50">Buscar</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Participante, actividad o sede"
                  className="w-full rounded-xl bg-black/30 py-3.5 pl-11 pr-10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                {busqueda && (
                  <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/50 hover:text-white" aria-label="Limpiar búsqueda"><X className="h-4 w-4" /></button>
                )}
              </span>
            </label>

            {tiposConParticipantes.length > 0 && (
              <div className="mb-3 border-t border-white/10 pt-5">
                <span className="mb-3 block text-xs font-medium uppercase tracking-[0.15em] text-white/50">Actividad</span>
                <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
                  {[{ id: null, nombre: 'Todas' }, ...tiposConParticipantes].map((tipo) => (
                    <button
                      key={tipo.id ?? 'todas'}
                      onClick={() => setTipoId(tipo.id)}
                      className={`shrink-0 rounded-lg px-4 py-2 text-sm transition ${tipoId === tipo.id ? 'bg-white/90 text-[#1a1716]' : 'text-white/80 hover:bg-white/10'}`}
                    >
                      {tipo.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="mb-2 text-sm text-white/50">{filtrados.length} {filtrados.length === 1 ? 'participante' : 'participantes'}</p>

            <div className="-mx-6 min-h-0 flex-1 overflow-y-auto border-t border-white/10 [scrollbar-color:rgba(255,255,255,0.4)_transparent] [scrollbar-width:thin]">
              {cargando ? (
                <div className="flex justify-center p-10"><Loader2 className="h-7 w-7 animate-spin text-white/60" /></div>
              ) : filtrados.length === 0 ? (
                <p className="p-8 text-center text-white/60">{participantes.length === 0 ? 'La cartelera se publicará pronto.' : 'No hay resultados con esos filtros.'}</p>
              ) : (
                <div className="pl-2">
                  {filtrados.map((participante) => (
                    <TarjetaParticipante
                      key={participante.id}
                      participante={participante}
                      tipo={participante.tipo_id ? tiposPorId[participante.tipo_id] : undefined}
                      seleccionado={participante.id === enEscritorio?.id}
                      onSeleccionar={() => seleccionar(participante.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Panel derecho (escritorio) */}
          <div className={`min-h-0 min-w-0 lg:block ${carteleraVacia ? 'block' : 'hidden'}`}>
            {enEscritorio ? (
              <DetalleParticipante key={enEscritorio.id} participante={enEscritorio} tipo={enEscritorio.tipo_id ? tiposPorId[enEscritorio.tipo_id] : undefined} />
            ) : !cargando && (
              <Bienvenida festival={edicion?.nombre} sinParticipantes={participantes.length === 0} />
            )}
          </div>
        </div>
      </div>

      {/* Detalle en celular: hoja inferior */}
      {seleccionado && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/60 lg:hidden" onClick={() => seleccionar(null)}>
          <div className="relative h-[88vh] w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => seleccionar(null)} className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white" aria-label="Cerrar"><X className="h-5 w-5" /></button>
            <DetalleParticipante key={seleccionado.id} participante={seleccionado} tipo={seleccionado.tipo_id ? tiposPorId[seleccionado.tipo_id] : undefined} />
          </div>
        </div>
      )}

      {/* Barra inferior de grupos */}
      {gruposConParticipantes.length > 0 && (
        <nav aria-label="Grupos de participantes" className="fixed inset-x-0 bottom-4 z-20 flex justify-center px-3">
          <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-[#f4f1ec]/95 p-1.5 shadow-2xl backdrop-blur">
            {barra.map((grupo) => {
              const activo = (grupo?.id ?? null) === grupoId;
              return (
                <button
                  key={grupo?.id ?? 'todos'}
                  onClick={() => setGrupoId(grupo?.id ?? null)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition sm:px-5 sm:text-base ${
                    activo ? 'text-[#1a1716] shadow-[0_0_0_3px_#1a1716]' : 'text-[#1a1716]/80 hover:bg-black/5'
                  }`}
                  style={activo && grupo ? { backgroundColor: grupo.color } : activo ? { backgroundColor: '#ffffff' } : undefined}
                >
                  {grupo && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activo ? '#1a1716' : grupo.color }} />}
                  {grupo?.nombre ?? 'Todos'}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
