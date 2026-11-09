import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, WheelEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CAMPOS_PARTICIPANTE, cargarCatalogos, cargarEdicion, claveHora, etiquetaDia } from './cartelera';
import type { Catalogo, Edicion, Participante } from './cartelera';
import { DetalleActivo, FichaParticipante } from './DetalleParticipante';
import { NavCartelera, PieCartelera } from './MarcoCartelera';
import { Bienvenida } from './Bienvenida';

// Mientras FDMA no suba su propia foto en Admin → Cartelera → Ajustes
const FONDO_POR_DEFECTO = '/galeria/foto3.jpeg';

// Colores de los días del cartel del festival (15, 16, 17, 18); si hay más días se repiten
const COLORES_DIA = ['#3fb6c9', '#f2c14e', '#8bc34a', '#e07b39'];

// Fila de botones que se desliza de lado sin barra de desplazamiento visible.
// La orilla se desvanece solo del lado donde hay más botones escondidos.
function FilaDeslizable({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mas, setMas] = useState({ izquierda: false, derecha: false });

  const medir = useCallback(() => {
    const fila = ref.current;
    if (!fila) return;
    const izquierda = fila.scrollLeft > 2;
    const derecha = fila.scrollLeft + fila.clientWidth < fila.scrollWidth - 2;
    setMas((actual) => actual.izquierda === izquierda && actual.derecha === derecha ? actual : { izquierda, derecha });
  }, []);

  // Se vuelve a medir en cada render (cambian los botones) y al cambiar el tamaño de la ventana
  useEffect(medir);
  useEffect(() => {
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [medir]);

  // Con mouse, la rueda vertical también desliza la fila
  function manejarRueda(e: WheelEvent<HTMLDivElement>) {
    if (ref.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) ref.current.scrollLeft += e.deltaY;
  }

  const mascara = `linear-gradient(to right, ${mas.izquierda ? 'transparent, black 40px' : 'black'}, ${mas.derecha ? 'black calc(100% - 40px), transparent' : 'black'})`;

  return (
    <div
      ref={ref}
      onScroll={medir}
      onWheel={manejarRueda}
      className="-mx-1 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ maskImage: mascara, WebkitMaskImage: mascara }}
    >
      {children}
    </div>
  );
}

const normalizar =(texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function CarteleraPage() {
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [tipos, setTipos] = useState<Catalogo[]>([]);
  const [grupos, setGrupos] = useState<Catalogo[]>([]);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [tipoId, setTipoId] = useState<string | null>(null);
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  // En celular los filtros van plegados para que la lista quede a la vista
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  // ?p=<id> permite compartir el enlace a un participante; ?edicion=2026 muestra una edición anterior
  const [parametros] = useSearchParams();
  const enlaceId = parametros.get('p');
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
  const gruposConParticipantes = grupos.filter((grupo) => participantes.some((participante) => participante.grupo_ids.includes(grupo.id)));

  // Los días salen solos de los horarios: una actividad de dos días aparece en ambos
  const dias = useMemo(
    () => [...new Set(participantes.flatMap((participante) => participante.cartelera_horarios.map((horario) => horario.fecha)))].sort(),
    [participantes],
  );

  const filtrados = useMemo(() => {
    const termino = normalizar(busqueda.trim());
    // Primer horario (fecha + hora) del participante; con un día elegido, solo los de ese día
    const primerHorario = (participante: Participante) => participante.cartelera_horarios
      .filter((horario) => !fecha || horario.fecha === fecha)
      .map((horario) => `${horario.fecha} ${claveHora(horario.hora_inicio)}`)
      .sort()[0];

    const resultado = participantes.filter((participante) => {
      if (tipoId && participante.tipo_id !== tipoId) return false;
      if (grupoId && !participante.grupo_ids.includes(grupoId)) return false;
      if (fecha && !participante.cartelera_horarios.some((horario) => horario.fecha === fecha)) return false;
      if (!termino) return true;
      const texto = [participante.nombre, participante.subtitulo, ...participante.cartelera_horarios.map((horario) => horario.sede)]
        .filter(Boolean)
        .join(' ');
      return normalizar(texto).includes(termino);
    });
    // Como programa: primero lo que pasa antes; sin horario, al final. Los empates
    // quedan por nombre porque la consulta ya llega así y sort no los mueve
    return resultado.sort((a, b) => {
      const claveA = primerHorario(a);
      const claveB = primerHorario(b);
      if (!claveA || !claveB) return claveA ? -1 : claveB ? 1 : 0;
      return claveA.localeCompare(claveB);
    });
  }, [participantes, busqueda, tipoId, grupoId, fecha]);

  const carteleraVacia = !cargando && participantes.length === 0;

  // Ficha activa: la que cruza la mitad de la pantalla al desplazarse, como en la referencia de ITCA
  const [activoId, setActivoId] = useState<string | null>(null);
  const fichas = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        const visible = entradas.find((entrada) => entrada.isIntersecting);
        if (visible) setActivoId((visible.target as HTMLElement).dataset.id ?? null);
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    fichas.current.forEach((ficha) => observador.observe(ficha));
    return () => observador.disconnect();
  }, [filtrados]);

  const activo = filtrados.find((participante) => participante.id === activoId) ?? filtrados[0];

  function enfocar(id: string) {
    fichas.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Enlace compartido (?p=<id>): al cargar, se desplaza hasta esa ficha
  const enlaceAplicado = useRef(false);
  useEffect(() => {
    if (cargando || enlaceAplicado.current || !enlaceId) return;
    enlaceAplicado.current = true;
    requestAnimationFrame(() => fichas.current.get(enlaceId)?.scrollIntoView({ block: 'center' }));
  }, [cargando, enlaceId]);

  // La barra inferior empieza con "Todos" y sigue con los días en orden
  const barra: (string | null)[] = [null, ...dias];

  const contador = <p className="text-sm text-white/50">{filtrados.length} {filtrados.length === 1 ? 'participante' : 'participantes'}</p>;

  // Los mismos filtros van en el panel fijo (escritorio) y en "Buscar y filtrar" (celular)
  // En laptop va más compacto para dejarle espacio a la descripción en el panel fijo
  const filtros = (
    <div className="space-y-4 lg:space-y-3">
      <label className="block">
        <span className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-white/50 lg:mb-1.5">Buscar</span>
        <span className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Participante, actividad o sede"
            className="w-full rounded-xl bg-black/30 py-3 pl-11 pr-10 lg:py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/50 hover:text-white" aria-label="Limpiar búsqueda"><X className="h-4 w-4" /></button>
          )}
        </span>
      </label>

      {tiposConParticipantes.length > 0 && (
        <div className="border-t border-white/10 pt-4 lg:pt-3">
          <span className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-white/50 lg:mb-1.5">Actividad</span>
          <FilaDeslizable>
            {[{ id: null, nombre: 'Todas' }, ...tiposConParticipantes].map((tipo) => (
              <button
                key={tipo.id ?? 'todas'}
                onClick={() => setTipoId(tipo.id)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm transition lg:py-1.5 ${tipoId === tipo.id ? 'bg-white/90 text-[#1a1716]' : 'text-white/80 hover:bg-white/10'}`}
              >
                {tipo.nombre}
              </button>
            ))}
          </FilaDeslizable>
        </div>
      )}

      {gruposConParticipantes.length > 0 && (
        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-white/50 lg:mb-1.5">Grupo</span>
          <FilaDeslizable>
            {[{ id: null, nombre: 'Todos', color: null }, ...gruposConParticipantes].map((grupo) => (
              <button
                key={grupo.id ?? 'todos'}
                onClick={() => setGrupoId(grupo.id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm transition lg:py-1.5 ${grupoId === grupo.id ? 'bg-white/90 text-[#1a1716]' : 'text-white/80 hover:bg-white/10'}`}
              >
                {grupo.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: grupo.color }} />}
                {grupo.nombre}
              </button>
            ))}
          </FilaDeslizable>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#12261d] font-sans text-white">
      {!cargando && (
        <img src={edicion?.cartelera_fondo_url || FONDO_POR_DEFECTO} alt="" aria-hidden="true" className="fixed inset-0 h-full w-full object-cover" />
      )}
      {/* Velo verde bosque: deja ver la foto sin perder legibilidad */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0c1f16]/80 via-[#0c1f16]/45 to-[#0c1f16]/75" aria-hidden="true" />

      {/* Toda la página se desplaza con la barra del navegador; solo el panel izquierdo queda fijo */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-4 lg:px-8">
        <NavCartelera edicion={edicion} />
        <h1 className="mb-4 truncate text-center text-xs font-medium uppercase tracking-[0.2em] text-white/80 sm:text-sm">{edicion?.nombre ?? 'Cartelera'}</h1>

        {edicion && !edicion.es_actual && (
          <div className="mb-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl bg-black/40 px-4 py-2 text-center text-sm text-white/85 backdrop-blur">
            <span>Estás viendo la edición {edicion.anio} del festival.</span>
            <Link to="/cartelera" className="font-semibold text-white underline hover:no-underline">Ver la edición actual</Link>
          </div>
        )}

        {/* Celular: "Buscar y filtrar" plegable que se queda fijo arriba al bajar */}
        {!carteleraVacia && (
          <div className="sticky top-2 z-30 mb-4 lg:hidden">
            <button
              type="button"
              onClick={() => setFiltrosAbiertos((abiertos) => !abiertos)}
              aria-expanded={filtrosAbiertos}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#0c1f16]/95 px-4 py-3 text-left shadow-lg backdrop-blur"
            >
              <span className="flex items-baseline gap-2 font-medium text-white">
                Buscar y filtrar <span className="text-sm tabular-nums text-white/50">{filtrados.length}</span>
              </span>
              <ChevronDown className={`h-5 w-5 text-white/70 transition-transform ${filtrosAbiertos ? 'rotate-180' : ''}`} />
            </button>
            {filtrosAbiertos && (
              <div className="mt-2 max-h-[70svh] space-y-4 overflow-y-auto rounded-xl border border-white/10 bg-[#0c1f16]/95 p-4 shadow-lg backdrop-blur">
                {filtros}
                {contador}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Escritorio: panel fijo con los filtros y los datos de la ficha activa */}
          <div className="hidden lg:col-span-5 lg:block">
            {/* En escritorio la barra de días va bajo la columna derecha, así el panel ocupa todo el alto */}
            <div className="sticky top-0 flex h-svh items-center pb-4 pt-4">
              <aside className="flex max-h-full w-full flex-col gap-3 overflow-hidden rounded-2xl border border-white/10 bg-[#10241b]/80 p-5 backdrop-blur-md">
                <div className="flex-none space-y-2">
                  {filtros}
                  {contador}
                </div>
                {activo && (
                  <div className="min-h-0 flex-auto overflow-y-auto overscroll-contain border-t border-white/10 pr-2 pt-4 [scrollbar-color:rgba(255,255,255,0.4)_transparent] [scrollbar-width:thin]">
                    <DetalleActivo participante={activo} fecha={fecha} />
                  </div>
                )}
              </aside>
            </div>
          </div>

          <div className="lg:col-span-7">
            {cargando ? (
              <div className="flex justify-center p-16"><Loader2 className="h-8 w-8 animate-spin text-white/60" /></div>
            ) : carteleraVacia ? (
              <div className="py-6 lg:py-[16svh]">
                <Bienvenida festival={edicion?.nombre} sinParticipantes />
              </div>
            ) : filtrados.length === 0 ? (
              <p className="rounded-2xl bg-[#10241b]/70 p-8 text-center text-white/70 backdrop-blur-md lg:mt-[16svh]">No hay resultados con esos filtros.</p>
            ) : (
              <ol>
                {filtrados.map((participante) => (
                  <li
                    key={participante.id}
                    data-id={participante.id}
                    ref={(elemento) => {
                      if (elemento) fichas.current.set(participante.id, elemento);
                      else fichas.current.delete(participante.id);
                    }}
                    className="py-2 lg:py-[8svh] lg:first:pt-[16svh] lg:last:pb-[34svh]"
                  >
                    <FichaParticipante
                      participante={participante}
                      tipo={participante.tipo_id ? tiposPorId[participante.tipo_id] : undefined}
                      activa={participante.id === activo?.id}
                      fecha={fecha}
                      onEnfocar={() => enfocar(participante.id)}
                    />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* pb-28: que la barra de días no tape el pie */}
        <div className="pb-28">
          <PieCartelera />
        </div>
      </div>

      {/* Barra inferior de días (sale de las fechas de los horarios) */}
      {dias.length > 1 && (
        <nav aria-label="Días del festival" className="pointer-events-none fixed inset-x-0 bottom-4 z-20 mx-auto grid max-w-7xl grid-cols-1 gap-8 px-3 lg:grid-cols-12 lg:px-8">
          <div className="flex min-w-0 justify-center lg:col-span-7 lg:col-start-6">
          <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-[#f4f1ec]/95 p-1.5 shadow-2xl backdrop-blur">
            {barra.map((dia) => {
              const diaActivo = dia === fecha;
              const color = dia ? COLORES_DIA[dias.indexOf(dia) % COLORES_DIA.length] : null;
              return (
                <button
                  key={dia ?? 'todos'}
                  onClick={() => setFecha(dia)}
                  aria-pressed={diaActivo}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition sm:px-5 sm:text-base ${
                    diaActivo ? 'text-[#1a1716] shadow-[0_0_0_3px_#1a1716]' : 'text-[#1a1716]/80 hover:bg-black/5'
                  }`}
                  style={diaActivo ? { backgroundColor: color ?? '#ffffff' } : undefined}
                >
                  {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: diaActivo ? '#1a1716' : color }} />}
                  {dia ? etiquetaDia(dia) : 'Todos'}
                </button>
              );
            })}
          </div>
          </div>
        </nav>
      )}
    </div>
  );
}
