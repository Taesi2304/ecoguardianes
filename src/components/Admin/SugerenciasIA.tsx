import { useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, Check, Clock, ExternalLink, Loader2, Megaphone, RefreshCw, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { copiarImagen } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatearFecha } from '@/lib/utils';
import { BUCKET_IMAGENES, cargarEdicion } from '@/components/Cartelera/cartelera';
import type { Edicion } from '@/components/Cartelera/cartelera';

// Bandeja de sugerencias: al sincronizar, la IA (o las reglas de palabras clave) revisa cada
// publicación de FDMA y propone convocatorias, actividades (con su destino: Cartelera, Taller
// o Calendario), cambios de fecha de convocatorias y cambios de horario de actividades.
// Nada se publica hasta que el Super Admin aprueba aquí. Ver supabase/functions/_shared/clasificar.ts.

type Tipo = 'convocatoria' | 'evento' | 'actualizacion' | 'cambio_actividad';
type Destino = 'cartelera' | 'taller' | 'calendario';

// Campos nuevos opcionales: las sugerencias guardadas antes de 30_ia_destinos.sql no los traen
interface EventoSugerido {
  titulo: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  descripcion: string;
  destino?: Destino;
  quien?: string;
  tipo_actividad?: string;
  costo?: string;
  cupo?: string;
  existente_id?: string;
  existente_destino?: Destino | '';
  existente_titulo?: string;
}

// Evento listo para editar en la tarjeta
interface EventoEditable extends Required<Omit<EventoSugerido, 'tipo_actividad' | 'existente_destino'>> {
  existente_destino: Destino | '';
  tipo_id: string;
  incluir: boolean;
}

interface DatosConvocatoria {
  titulo: string;
  descripcion: string;
  fecha_cierre: string;
  enlace_url: string;
}

interface DatosActualizacion {
  convocatoria_id: string;
  convocatoria_titulo: string;
  fecha_anterior: string | null;
  nueva_fecha_cierre: string;
  nota: string;
}

interface DatosCambio {
  destino: Destino;
  id: string;
  horario_id: string | null;
  titulo_actual: string;
  fecha_anterior: string | null;
  hora_anterior: string | null;
  lugar_anterior: string | null;
  nueva_fecha: string;
  nueva_hora_inicio: string;
  nueva_hora_fin: string;
  nuevo_lugar: string;
  nota: string;
}

interface Sugerencia {
  id: string;
  tipo: Tipo;
  datos: DatosConvocatoria | { eventos: EventoSugerido[] } | DatosActualizacion | DatosCambio;
  motivo: string | null;
  origen: 'ia' | 'reglas';
  publicaciones: { imagen_url: string | null; texto: string | null; enlace_url: string | null; red_social: string; fecha_publicacion: string } | null;
}

interface Opcion {
  id: string;
  nombre: string;
}

interface Contexto {
  categorias: Opcion[];
  tipos: Opcion[]; // Tipos de actividad de la cartelera
  edicion: Edicion | null;
}

const LIMITE_DESCRIPCION = 180; // Igual que en AdminConvocatorias.tsx
const claseInput = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal focus:border-green-500 focus:outline-none';
const claseEtiqueta = 'block text-xs font-semibold text-gray-600';

const ETIQUETAS: Record<Tipo, { nombre: string; icono: typeof Megaphone; clase: string }> = {
  convocatoria: { nombre: 'Convocatoria', icono: Megaphone, clase: 'bg-pink-100 text-pink-800' },
  evento: { nombre: 'Actividad', icono: CalendarDays, clase: 'bg-blue-100 text-blue-800' },
  actualizacion: { nombre: 'Cambio de fecha límite', icono: RefreshCw, clase: 'bg-amber-100 text-amber-800' },
  cambio_actividad: { nombre: 'Cambio de horario', icono: Clock, clase: 'bg-amber-100 text-amber-800' },
};

const SECCION: Record<Destino, string> = { cartelera: 'Cartelera', taller: 'Talleres', calendario: 'Calendario' };

// La foto de la publicación se copia una vez por bucket y se reutiliza durante una aprobación
type CopiaImagen = (bucket: string, carpeta: string) => Promise<string>;
function copiadorDeImagen(url: string | undefined): CopiaImagen {
  const copias = new Map<string, Promise<string>>();
  return (bucket, carpeta) => {
    if (!url) return Promise.resolve('');
    if (!copias.has(bucket)) copias.set(bucket, copiarImagen(url, bucket, carpeta));
    return copias.get(bucket)!;
  };
}

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const numeroONull = (valor: string) => (valor.trim() === '' ? null : Number(valor));

// Lo que guardó la IA → lo que se edita en la tarjeta (con valores por defecto para sugerencias viejas)
function aEditable(evento: EventoSugerido, ctx: Contexto): EventoEditable {
  let destino: Destino = evento.destino ?? 'calendario';
  if (destino === 'cartelera' && !ctx.edicion) destino = 'calendario';
  return {
    titulo: evento.titulo ?? '',
    fecha: evento.fecha ?? '',
    hora_inicio: evento.hora_inicio ?? '',
    hora_fin: evento.hora_fin ?? '',
    lugar: evento.lugar ?? '',
    descripcion: evento.descripcion ?? '',
    destino,
    quien: evento.quien ?? '',
    costo: evento.costo ?? '',
    cupo: evento.cupo ?? '',
    tipo_id: ctx.tipos.find((tipo) => normalizar(tipo.nombre) === normalizar(evento.tipo_actividad ?? ''))?.id ?? '',
    existente_id: evento.existente_id ?? '',
    existente_destino: evento.existente_destino ?? '',
    existente_titulo: evento.existente_titulo ?? '',
    // Lo que ya está en la página no se vuelve a agregar, salvo que se marque
    incluir: !evento.existente_id,
  };
}

function TarjetaSugerencia({ sugerencia, ctx, onResuelta }: {
  sugerencia: Sugerencia;
  ctx: Contexto;
  onResuelta: (id: string) => void;
}) {
  const [datos, setDatos] = useState(sugerencia.datos);
  const [eventos, setEventos] = useState<EventoEditable[]>(() =>
    ((sugerencia.datos as { eventos?: EventoSugerido[] }).eventos ?? []).map((evento) => aEditable(evento, ctx)));
  const [categoriaId, setCategoriaId] = useState(() => ctx.categorias.find((c) => c.nombre === 'Festival del Medio Ambiente')?.id ?? '');
  const [trabajando, setTrabajando] = useState(false);
  const publicacion = sugerencia.publicaciones;
  const etiqueta = ETIQUETAS[sugerencia.tipo];

  const convocatoria = datos as DatosConvocatoria;
  const actualizacion = datos as DatosActualizacion;
  const cambio = datos as DatosCambio;

  const cambiar = (campo: string, valor: string) => setDatos((actual) => ({ ...actual, [campo]: valor }));
  const cambiarEvento = <K extends keyof EventoEditable>(indice: number, campo: K, valor: EventoEditable[K]) =>
    setEventos((actuales) => actuales.map((evento, i) => i === indice ? { ...evento, [campo]: valor } : evento));
  const quitarEvento = (indice: number) => setEventos((actuales) => actuales.filter((_, i) => i !== indice));

  const incluidos = eventos.filter((evento) => evento.incluir);
  const destinosIncluidos = [...new Set(incluidos.map((evento) => evento.destino))];

  async function marcar(estado: 'aprobada' | 'descartada') {
    const datosFinales = sugerencia.tipo === 'evento' ? { eventos } : datos;
    const { error } = await supabase
      .from('sugerencias_ia')
      .update({ estado, datos: datosFinales, resuelta_en: new Date().toISOString() })
      .eq('id', sugerencia.id);
    if (error) throw error;
  }

  async function aprobarEventos(imagenEn: CopiaImagen) {
    if (incluidos.length === 0) throw new Error('No hay actividades marcadas para agregar.');
    for (const evento of incluidos) {
      if (!evento.titulo.trim()) throw new Error('Cada actividad necesita nombre.');
      if (evento.destino !== 'taller' && !evento.fecha) throw new Error(`«${evento.titulo}» necesita fecha.`);
      if (evento.destino === 'taller' && !evento.lugar.trim()) throw new Error(`El taller «${evento.titulo}» necesita lugar.`);
    }

    // Calendario
    const delCalendario = incluidos.filter((evento) => evento.destino === 'calendario');
    if (delCalendario.length) {
      const { error } = await supabase.from('eventos_calendario').insert(delCalendario.map((evento) => ({
        titulo: evento.titulo.trim(),
        fecha: evento.fecha,
        hora_inicio: evento.hora_inicio || null,
        hora_fin: evento.hora_fin || null,
        lugar: evento.lugar.trim() || null,
        descripcion: evento.descripcion.trim() || null,
        enlace_url: publicacion?.enlace_url ?? null,
        categoria_id: categoriaId || null,
        activo: true,
      })));
      if (error) throw error;
    }

    // Talleres
    const talleres = incluidos.filter((item) => item.destino === 'taller');
    if (talleres.length && !publicacion?.imagen_url) throw new Error('La publicación no tiene imagen: agrega el taller desde Talleres para subirle una.');
    for (const evento of talleres) {
      const { error } = await supabase.from('talleres').insert({
        titulo: evento.titulo.trim(),
        facilitador: evento.quien.trim() || null,
        descripcion: evento.descripcion.trim() || null,
        imagen_url: await imagenEn('imagenes_talleres', 'talleres'),
        fecha: evento.fecha || null,
        hora_inicio: evento.hora_inicio || null,
        hora_fin: evento.hora_fin || null,
        lugar: evento.lugar.trim(),
        cupo: Number(evento.cupo) > 0 ? Number(evento.cupo) : null,
        costo: numeroONull(evento.costo),
        activo: true,
      });
      if (error) throw error;
    }

    // Cartelera: la misma actividad en varias fechas es un solo participante con varios horarios
    const porActividad = new Map<string, EventoEditable[]>();
    for (const evento of incluidos.filter((item) => item.destino === 'cartelera')) {
      const clave = normalizar(evento.titulo);
      porActividad.set(clave, [...(porActividad.get(clave) ?? []), evento]);
    }
    for (const presentaciones of porActividad.values()) {
      const [primero] = presentaciones;
      const imagen = await imagenEn(BUCKET_IMAGENES, 'participantes');
      const { data, error } = await supabase
        .from('cartelera_participantes')
        .insert({
          nombre: primero.titulo.trim(),
          subtitulo: primero.quien.trim() || null,
          descripcion: primero.descripcion.trim() || null,
          tipo_id: primero.tipo_id || null,
          grupo_ids: [],
          imagenes: imagen ? [imagen] : [],
          enlace_url: publicacion?.enlace_url ?? null,
          costo: numeroONull(primero.costo),
          activo: true,
          edicion_id: ctx.edicion?.id,
        })
        .select('id')
        .single();
      if (error) throw error;
      const { error: errorHorarios } = await supabase.from('cartelera_horarios').insert(presentaciones.map((evento) => ({
        participante_id: data.id,
        fecha: evento.fecha,
        hora_inicio: evento.hora_inicio || null,
        hora_fin: evento.hora_fin || null,
        sede: evento.lugar.trim() || 'Por confirmar',
      })));
      if (errorHorarios) throw errorHorarios;
    }
  }

  async function aprobarCambio() {
    // Solo se cambia lo que trae valor; lo vacío se queda como estaba
    const nuevos: Record<string, string> = {};
    if (cambio.nueva_fecha) nuevos.fecha = cambio.nueva_fecha;
    if (cambio.nueva_hora_inicio) nuevos.hora_inicio = cambio.nueva_hora_inicio;
    if (cambio.nueva_hora_fin) nuevos.hora_fin = cambio.nueva_hora_fin;
    if (cambio.nuevo_lugar.trim()) nuevos[cambio.destino === 'cartelera' ? 'sede' : 'lugar'] = cambio.nuevo_lugar.trim();
    if (Object.keys(nuevos).length === 0) throw new Error('Indica al menos un dato nuevo.');

    const consulta = cambio.destino === 'cartelera'
      ? supabase.from('cartelera_horarios').update(nuevos).eq('id', cambio.horario_id ?? '')
      : supabase.from(cambio.destino === 'taller' ? 'talleres' : 'eventos_calendario').update(nuevos).eq('id', cambio.id);
    const { error } = await consulta;
    if (error) throw error;
  }

  async function aprobar() {
    setTrabajando(true);
    const imagenEn = copiadorDeImagen(publicacion?.imagen_url ?? undefined);
    try {
      let mensaje: string;
      if (sugerencia.tipo === 'convocatoria') {
        if (!convocatoria.titulo.trim()) throw new Error('La convocatoria necesita título.');
        if (!publicacion?.imagen_url) throw new Error('La publicación no tiene imagen: agrega la convocatoria desde Convocatorias para subirle una.');
        const sinEnlace = !convocatoria.enlace_url.trim();
        const { error } = await supabase.from('convocatorias').insert({
          titulo: convocatoria.titulo.trim(),
          descripcion: (convocatoria.descripcion.trim() || convocatoria.titulo.trim()).slice(0, LIMITE_DESCRIPCION),
          imagen_url: await imagenEn('imagenes_convocatorias', 'convocatorias'),
          // Sin enlace de registro, el botón lleva a la publicación original
          enlace_url: convocatoria.enlace_url.trim() || publicacion?.enlace_url || null,
          texto_boton: sinEnlace && publicacion?.enlace_url ? 'Más información' : null,
          fecha_cierre: convocatoria.fecha_cierre || null,
          activo: true,
        });
        if (error) throw error;
        mensaje = 'Convocatoria publicada.';
      } else if (sugerencia.tipo === 'evento') {
        await aprobarEventos(imagenEn);
        mensaje = destinosIncluidos.length === 1
          ? { cartelera: 'Agregado a la Cartelera.', taller: 'Taller publicado.', calendario: 'Agregado al calendario.' }[destinosIncluidos[0]]
          : 'Actividades agregadas.';
      } else if (sugerencia.tipo === 'cambio_actividad') {
        await aprobarCambio();
        mensaje = 'Horario actualizado.';
      } else {
        if (!actualizacion.nueva_fecha_cierre) throw new Error('Indica la nueva fecha límite.');
        const { error } = await supabase
          .from('convocatorias')
          .update({ fecha_cierre: actualizacion.nueva_fecha_cierre })
          .eq('id', actualizacion.convocatoria_id);
        if (error) throw error;
        mensaje = 'Fecha límite actualizada.';
      }

      await marcar('aprobada');
      toast.success(mensaje);
      onResuelta(sugerencia.id);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error && err.message ? err.message : 'No se pudo aprobar la sugerencia.');
    } finally {
      setTrabajando(false);
    }
  }

  async function descartar() {
    setTrabajando(true);
    try {
      await marcar('descartada');
      onResuelta(sugerencia.id);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo descartar.');
    } finally {
      setTrabajando(false);
    }
  }

  const Icono = etiqueta.icono;
  // Si todo lo sugerido ya existe, lo natural es descartar
  const soloExistentes = sugerencia.tipo === 'evento' && incluidos.length === 0;
  const textoAprobar = sugerencia.tipo === 'convocatoria' ? 'Publicar convocatoria'
    : sugerencia.tipo === 'actualizacion' ? 'Cambiar fecha'
      : sugerencia.tipo === 'cambio_actividad' ? 'Actualizar horario'
        : destinosIncluidos.length === 1
          ? { cartelera: `Agregar a la Cartelera`, taller: 'Publicar taller', calendario: 'Agregar al calendario' }[destinosIncluidos[0]]
          : 'Agregar actividades';

  return (
    <article className="grid gap-4 rounded-xl border border-gray-200 p-4 md:grid-cols-[140px_1fr]">
      <div className="space-y-2">
        {publicacion && (
          <a href={publicacion.enlace_url ?? undefined} target="_blank" rel="noreferrer" title="Ver la publicación original" className="block">
            {publicacion.imagen_url
              ? <img src={publicacion.imagen_url} alt="" className="aspect-square w-full rounded-lg object-cover" />
              : <p className="flex aspect-square w-full items-center overflow-hidden rounded-lg bg-[#f8f5f2] p-3 text-xs leading-snug text-gray-600"><span className="line-clamp-[8]">{publicacion.texto}</span></p>}
          </a>
        )}
        {publicacion && (
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <img src={publicacion.red_social === 'facebook' ? '/fb-icon.svg' : '/ig-icon.svg'} alt="" className="h-4 w-4" />
            {formatearFecha(publicacion.fecha_publicacion)}
          </p>
        )}
      </div>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${etiqueta.clase}`}>
            <Icono className="h-3.5 w-3.5" /> {etiqueta.nombre}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600" title={sugerencia.origen === 'ia' ? 'Gemini leyó el texto y la imagen' : 'Sin IA: solo palabras clave del texto'}>
            {sugerencia.origen === 'ia' ? 'IA' : 'Palabras clave'}
          </span>
          {publicacion?.enlace_url && (
            <a href={publicacion.enlace_url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:underline">
              Publicación original <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        {sugerencia.motivo && <p className="text-sm italic text-gray-600">{sugerencia.motivo}</p>}

        {sugerencia.tipo === 'convocatoria' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`${claseEtiqueta} sm:col-span-2`}>Título
              <input value={convocatoria.titulo} onChange={(e) => cambiar('titulo', e.target.value)} maxLength={150} className={claseInput} />
            </label>
            <label className={`${claseEtiqueta} sm:col-span-2`}>Descripción ({convocatoria.descripcion.length}/{LIMITE_DESCRIPCION})
              <textarea value={convocatoria.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} maxLength={LIMITE_DESCRIPCION} rows={3} className={`${claseInput} resize-none`} />
            </label>
            <label className={claseEtiqueta}>Fecha límite
              <input type="date" value={convocatoria.fecha_cierre} onChange={(e) => cambiar('fecha_cierre', e.target.value)} className={claseInput} />
            </label>
            <label className={claseEtiqueta}>Enlace de registro
              <input type="url" value={convocatoria.enlace_url} onChange={(e) => cambiar('enlace_url', e.target.value)} placeholder="Si lo dejas vacío, lleva a la publicación" className={claseInput} />
            </label>
          </div>
        )}

        {sugerencia.tipo === 'evento' && (
          <div className="space-y-3">
            {eventos.map((evento, indice) => (
              <div key={indice} className={`space-y-2 rounded-lg p-3 ${evento.incluir ? 'bg-gray-50' : 'bg-gray-50/60 opacity-75'}`}>
                {evento.existente_id && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Ya está en {SECCION[evento.existente_destino || 'calendario']}: <strong>«{evento.existente_titulo}»</strong>
                    </span>
                    <label className="flex items-center gap-1.5 font-semibold">
                      <input type="checkbox" checked={evento.incluir} onChange={(e) => cambiarEvento(indice, 'incluir', e.target.checked)} className="h-4 w-4 accent-green-600" />
                      Agregar de todas formas
                    </label>
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-[1.3fr_2fr_auto]">
                  <label className={claseEtiqueta}>Destino
                    <select value={evento.destino} onChange={(e) => cambiarEvento(indice, 'destino', e.target.value as Destino)} className={`${claseInput} bg-white`}>
                      <option value="cartelera" disabled={!ctx.edicion}>{ctx.edicion ? `Cartelera ${ctx.edicion.anio}` : 'Cartelera (sin edición actual)'}</option>
                      <option value="taller">Taller</option>
                      <option value="calendario">Calendario</option>
                    </select>
                  </label>
                  <label className={claseEtiqueta}>{evento.destino === 'cartelera' ? 'Nombre de la actividad' : 'Título'}
                    <input value={evento.titulo} onChange={(e) => cambiarEvento(indice, 'titulo', e.target.value)} maxLength={150} className={claseInput} />
                  </label>
                  <button type="button" onClick={() => quitarEvento(indice)} className="self-end rounded-lg p-2 text-gray-400 hover:bg-white hover:text-red-600" title="Quitar esta actividad">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-4">
                  <label className={claseEtiqueta}>Fecha{evento.destino === 'taller' ? ' (opcional)' : ''}
                    <input type="date" value={evento.fecha} onChange={(e) => cambiarEvento(indice, 'fecha', e.target.value)} className={claseInput} />
                  </label>
                  <label className={claseEtiqueta}>Inicio
                    <input type="time" value={evento.hora_inicio} onChange={(e) => cambiarEvento(indice, 'hora_inicio', e.target.value)} className={claseInput} />
                  </label>
                  <label className={claseEtiqueta}>Fin
                    <input type="time" value={evento.hora_fin} onChange={(e) => cambiarEvento(indice, 'hora_fin', e.target.value)} className={claseInput} />
                  </label>
                  <label className={claseEtiqueta}>{evento.destino === 'cartelera' ? 'Sede' : 'Lugar'}{evento.destino === 'taller' ? ' *' : ''}
                    <input value={evento.lugar} onChange={(e) => cambiarEvento(indice, 'lugar', e.target.value)} maxLength={200} className={claseInput} />
                  </label>
                </div>

                {evento.destino !== 'calendario' && (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <label className={claseEtiqueta}>{evento.destino === 'cartelera' ? 'Quién la imparte' : 'Facilitador'}
                      <input value={evento.quien} onChange={(e) => cambiarEvento(indice, 'quien', e.target.value)} maxLength={150} className={claseInput} />
                    </label>
                    {evento.destino === 'cartelera' ? (
                      <label className={claseEtiqueta}>Tipo de actividad
                        <select value={evento.tipo_id} onChange={(e) => cambiarEvento(indice, 'tipo_id', e.target.value)} className={`${claseInput} bg-white`}>
                          <option value="">Sin tipo</option>
                          {ctx.tipos.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
                        </select>
                      </label>
                    ) : (
                      <label className={claseEtiqueta}>Cupo
                        <input type="number" min={1} value={evento.cupo} onChange={(e) => cambiarEvento(indice, 'cupo', e.target.value)} placeholder="Sin límite" className={claseInput} />
                      </label>
                    )}
                    <label className={claseEtiqueta}>Costo (0 = gratuito)
                      <input type="number" min={0} step="0.01" value={evento.costo} onChange={(e) => cambiarEvento(indice, 'costo', e.target.value)} placeholder="No se muestra" className={claseInput} />
                    </label>
                  </div>
                )}
              </div>
            ))}
            {incluidos.some((evento) => evento.destino === 'calendario') && (
              <label className={`${claseEtiqueta} max-w-xs`}>Categoría del calendario
                <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={`${claseInput} bg-white`}>
                  <option value="">Sin categoría</option>
                  {ctx.categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
                </select>
              </label>
            )}
            {incluidos.some((evento) => evento.destino !== 'calendario') && publicacion && (
              <p className="text-xs text-gray-500">La imagen de la publicación se usa como foto de la actividad.</p>
            )}
          </div>
        )}

        {sugerencia.tipo === 'actualizacion' && (
          <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <p>
              Cambiar la fecha límite de <strong>«{actualizacion.convocatoria_titulo}»</strong>
              {actualizacion.fecha_anterior ? <> (hoy: {formatearFecha(actualizacion.fecha_anterior)})</> : ' (hoy sin fecha)'} a:
            </p>
            <input type="date" value={actualizacion.nueva_fecha_cierre} onChange={(e) => cambiar('nueva_fecha_cierre', e.target.value)} className={`${claseInput} max-w-xs bg-white`} />
            {actualizacion.nota && <p className="text-xs">{actualizacion.nota}</p>}
          </div>
        )}

        {sugerencia.tipo === 'cambio_actividad' && (
          <div className="space-y-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <p>
              Cambiar <strong>«{cambio.titulo_actual}»</strong> en {SECCION[cambio.destino]}. Hoy:{' '}
              {cambio.fecha_anterior ? formatearFecha(cambio.fecha_anterior) : 'sin fecha'}
              {cambio.hora_anterior ? ` · ${cambio.hora_anterior} h` : ''}
              {cambio.lugar_anterior ? ` · ${cambio.lugar_anterior}` : ''}
            </p>
            <div className="grid gap-2 sm:grid-cols-4">
              <label className={claseEtiqueta}>Nueva fecha
                <input type="date" value={cambio.nueva_fecha} onChange={(e) => cambiar('nueva_fecha', e.target.value)} className={`${claseInput} bg-white`} />
              </label>
              <label className={claseEtiqueta}>Nuevo inicio
                <input type="time" value={cambio.nueva_hora_inicio} onChange={(e) => cambiar('nueva_hora_inicio', e.target.value)} className={`${claseInput} bg-white`} />
              </label>
              <label className={claseEtiqueta}>Nuevo fin
                <input type="time" value={cambio.nueva_hora_fin} onChange={(e) => cambiar('nueva_hora_fin', e.target.value)} className={`${claseInput} bg-white`} />
              </label>
              <label className={claseEtiqueta}>Nuevo lugar
                <input value={cambio.nuevo_lugar} onChange={(e) => cambiar('nuevo_lugar', e.target.value)} maxLength={200} placeholder="Igual" className={`${claseInput} bg-white`} />
              </label>
            </div>
            <p className="text-xs">Lo que dejes vacío se queda como está.{cambio.nota ? ` ${cambio.nota}` : ''}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {soloExistentes ? (
            <>
              <button type="button" onClick={descartar} disabled={trabajando} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                {trabajando ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Descartar: ya está en la página
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={aprobar} disabled={trabajando} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                {trabajando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {textoAprobar}
              </button>
              <button type="button" onClick={descartar} disabled={trabajando} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-60">
                <X className="h-4 w-4" /> Descartar
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default function SugerenciasIA({ version }: { version: number }) {
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [ctx, setCtx] = useState<Contexto>({ categorias: [], tipos: [], edicion: null });
  const [disponible, setDisponible] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      const [{ data, error }, { data: dataCategorias }, { data: dataTipos }, edicion] = await Promise.all([
        supabase
          .from('sugerencias_ia')
          .select('id, tipo, datos, motivo, origen, publicaciones(imagen_url, texto, enlace_url, red_social, fecha_publicacion)')
          .eq('estado', 'pendiente')
          .order('created_at', { ascending: false }),
        supabase.from('calendario_categorias').select('id, nombre').order('orden'),
        supabase.from('cartelera_tipos').select('id, nombre').order('orden'),
        cargarEdicion(),
      ]);
      // La tabla no existe si aún no se corre database/26_sugerencias_ia.sql
      if (error) {
        setDisponible(false);
        return;
      }
      setCtx({ categorias: (dataCategorias || []) as Opcion[], tipos: (dataTipos || []) as Opcion[], edicion });
      setSugerencias((data || []) as unknown as Sugerencia[]);
    };
    cargar();
  }, [version]);

  if (!disponible || sugerencias.length === 0) return null;

  return (
    <Card className="border-transparent bg-white shadow-sm">
      <CardHeader className="border-b bg-gray-50/50 px-6 py-4">
        <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
          <Sparkles className="h-5 w-5 text-green-600" /> Sugerencias de la IA
          <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-bold text-white">{sugerencias.length}</span>
        </CardTitle>
        <p className="text-sm text-gray-500">
          Publicaciones de FDMA que parecen convocatorias, actividades o cambios de horario. La IA propone a dónde va cada actividad (Cartelera, Taller o Calendario); revisa los datos, porque puede equivocarse, y apruébalas con un clic.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {sugerencias.map((sugerencia) => (
          <TarjetaSugerencia
            key={sugerencia.id}
            sugerencia={sugerencia}
            ctx={ctx}
            onResuelta={(id) => setSugerencias((actuales) => actuales.filter((item) => item.id !== id))}
          />
        ))}
      </CardContent>
    </Card>
  );
}
