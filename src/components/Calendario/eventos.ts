import type { CSSProperties } from 'react';
import { supabase } from '@/lib/supabase';

// Categorías editables en Admin → Calendario → Categorías (tabla calendario_categorias)
export interface CategoriaCalendario {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  // Categorías que el Calendario llena solo: 'taller' (Talleres), 'festival' (días con
  // horarios en la Cartelera) y 'convocatoria' (fecha de cierre de convocatorias)
  clave: string | null;
}

export interface EventoCalendario {
  id: string;
  titulo: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  lugar: string | null;
  categoria: CategoriaCalendario | null;
  descripcion: string | null;
  enlace_url: string | null;
  texto_enlace?: string; // Texto del botón en el detalle; por defecto "Más información"
}

interface HorarioCartelera {
  id: string;
  fecha: string;
  sede: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  participante: { id: string; nombre: string; subtitulo: string | null; descripcion: string | null };
  edicion: { nombre: string; anio: number } | null; // null si aún no se corre 18_ediciones_festival.sql
}

type Relacion<T> = T | T[] | null;
const primero = <T,>(valor: Relacion<T>) => (Array.isArray(valor) ? valor[0] : valor) ?? null;

type ParticipanteConEdicion = HorarioCartelera['participante'] & { festival_ediciones?: Relacion<{ nombre: string; anio: number }> };
const CAMPOS_HORARIO = 'id, fecha, sede, hora_inicio, hora_fin';
const CAMPOS_DEL_PARTICIPANTE = 'id, nombre, subtitulo, descripcion, activo';

// Horarios de participantes activos, con quién se presenta y la edición del festival a la que pertenece
async function cargarHorariosFestival(desde: string, hasta: string): Promise<HorarioCartelera[]> {
  const consultar = (camposParticipante: string) => supabase
    .from('cartelera_horarios')
    .select(`${CAMPOS_HORARIO}, cartelera_participantes!inner(${camposParticipante})`)
    .eq('cartelera_participantes.activo', true)
    .gte('fecha', desde)
    .lte('fecha', hasta);

  const conEdicion = await consultar(`${CAMPOS_DEL_PARTICIPANTE}, festival_ediciones(nombre, anio)`);
  // Sin la tabla de ediciones (18_ediciones_festival.sql sin correr): los mismos datos sin edición
  const { data } = conEdicion.error ? await consultar(CAMPOS_DEL_PARTICIPANTE) : conEdicion;
  // Los campos se arman en tiempo de ejecución, así que TypeScript no puede deducir el tipo de las filas
  const filas = (data || []) as unknown as (Omit<HorarioCartelera, 'participante' | 'edicion'> & { cartelera_participantes: unknown })[];

  return filas.flatMap(({ cartelera_participantes, ...horario }) => {
    const participante = primero(cartelera_participantes as unknown as Relacion<ParticipanteConEdicion>);
    if (!participante) return [];
    const { id, nombre, subtitulo, descripcion } = participante;
    return [{ ...horario, participante: { id, nombre, subtitulo, descripcion }, edicion: primero(participante.festival_ediciones ?? null) }];
  });
}

const COLOR_SIN_CATEGORIA = '#9ca3af';

// Colores con estilo en línea porque vienen de la base (hex elegido por FDMA).
// El texto siempre va oscuro para que se lea con cualquier color, incluso amarillo.
export const estiloPunto = (categoria: CategoriaCalendario | null): CSSProperties => ({
  backgroundColor: categoria?.color ?? COLOR_SIN_CATEGORIA,
});

export const estiloChip = (categoria: CategoriaCalendario | null): CSSProperties => {
  const color = categoria?.color ?? COLOR_SIN_CATEGORIA;
  return { backgroundColor: `${color}22`, borderColor: `${color}66`, color: '#3b2a1c' };
};

export async function cargarCategorias(): Promise<CategoriaCalendario[]> {
  const { data } = await supabase
    .from('calendario_categorias')
    .select('id, nombre, color, orden, clave')
    .order('orden', { ascending: true });
  return (data || []) as CategoriaCalendario[];
}

// Cada presentación de la Cartelera es un evento del calendario: se captura una sola vez, en la Cartelera.
// El enlace lleva directo a la ficha del participante (y a su edición, si es de otro año)
function eventosDelFestival(horarios: HorarioCartelera[], categoria: CategoriaCalendario | null): EventoCalendario[] {
  return horarios.map(({ id, fecha, sede, hora_inicio, hora_fin, participante, edicion }) => {
    const parametros = new URLSearchParams({ ...(edicion ? { edicion: String(edicion.anio) } : {}), p: participante.id });
    return {
      id: `festival-${id}`,
      titulo: participante.nombre,
      fecha,
      hora_inicio,
      hora_fin,
      lugar: sede,
      categoria,
      descripcion: [participante.subtitulo, participante.descripcion, edicion && `Parte del ${edicion.nombre}.`].filter(Boolean).join('\n\n') || null,
      enlace_url: `/cartelera?${parametros}`,
      texto_enlace: 'Ver en la cartelera',
    };
  });
}

// Eventos del calendario + talleres + días del festival + cierres de convocatoria
// entre dos fechas 'YYYY-MM-DD'
export async function cargarEventos(desde: string, hasta: string, categorias?: CategoriaCalendario[]): Promise<EventoCalendario[]> {
  const [eventos, talleres, horarios, pagina, convocatorias, listaCategorias] = await Promise.all([
    supabase
      .from('eventos_calendario')
      .select('id, titulo, fecha, hora_inicio, hora_fin, lugar, categoria_id, descripcion, enlace_url')
      .eq('activo', true)
      .gte('fecha', desde)
      .lte('fecha', hasta),
    supabase
      .from('talleres_publicos')
      .select('id, titulo, fecha, hora_inicio, hora_fin, lugar, descripcion')
      .gte('fecha', desde)
      .lte('fecha', hasta),
    cargarHorariosFestival(desde, hasta),
    supabase
      .from('pagina_inicio')
      .select('mostrar_cartelera')
      .eq('id', 1)
      .maybeSingle(),
    supabase
      .from('convocatorias')
      .select('id, titulo, descripcion, enlace_url, fecha_cierre')
      .eq('activo', true)
      .gte('fecha_cierre', desde)
      .lte('fecha_cierre', hasta),
    categorias ? Promise.resolve(categorias) : cargarCategorias(),
  ]);

  const porId = new Map(listaCategorias.map((categoria) => [categoria.id, categoria]));
  const porClave = (clave: string) => listaCategorias.find((categoria) => categoria.clave === clave) ?? null;
  const categoriaTaller = porClave('taller');

  const propios: EventoCalendario[] = (eventos.data || []).map(({ categoria_id, ...evento }) => ({
    ...evento,
    categoria: (categoria_id && porId.get(categoria_id)) || null,
  }));

  const deTalleres: EventoCalendario[] = (talleres.data || []).map((taller) => ({
    ...taller,
    id: `taller-${taller.id}`,
    categoria: categoriaTaller,
    enlace_url: '/talleres',
    texto_enlace: 'Registrarme',
  }));

  // Si la Cartelera está oculta en la página de inicio, el festival tampoco sale
  const deFestival = pagina.data?.mostrar_cartelera
    ? eventosDelFestival(horarios, porClave('festival'))
    : [];

  const deConvocatorias: EventoCalendario[] = (convocatorias.data || []).map((convocatoria) => ({
    id: `convocatoria-${convocatoria.id}`,
    titulo: `Cierra convocatoria: ${convocatoria.titulo}`,
    fecha: convocatoria.fecha_cierre,
    hora_inicio: null,
    hora_fin: null,
    lugar: null,
    categoria: porClave('convocatoria'),
    descripcion: convocatoria.descripcion,
    enlace_url: convocatoria.enlace_url || '/',
    texto_enlace: convocatoria.enlace_url ? 'Participar' : 'Ver convocatoria',
  }));

  return [...propios, ...deTalleres, ...deFestival, ...deConvocatorias]
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora_inicio || '').localeCompare(b.hora_inicio || ''));
}
