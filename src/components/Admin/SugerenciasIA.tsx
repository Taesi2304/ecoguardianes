import { useEffect, useState } from 'react';
import { CalendarDays, Check, ExternalLink, Loader2, Megaphone, RefreshCw, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatearFecha } from '@/lib/utils';

// Bandeja de sugerencias: al sincronizar, la IA (o las reglas de palabras clave) revisa cada
// publicación de FDMA y propone convocatorias, eventos del calendario o cambios de fecha.
// Nada se publica hasta que el Super Admin aprueba aquí. Ver _shared/clasificar.ts.

type Tipo = 'convocatoria' | 'evento' | 'actualizacion';

interface EventoSugerido {
  titulo: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  descripcion: string;
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

interface Sugerencia {
  id: string;
  tipo: Tipo;
  datos: DatosConvocatoria | { eventos: EventoSugerido[] } | DatosActualizacion;
  motivo: string | null;
  origen: 'ia' | 'reglas';
  publicaciones: { imagen_url: string; texto: string | null; enlace_url: string | null; red_social: string; fecha_publicacion: string } | null;
}

interface Categoria {
  id: string;
  nombre: string;
}

const LIMITE_DESCRIPCION = 180; // Igual que en AdminConvocatorias.tsx
const claseInput = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal focus:border-green-500 focus:outline-none';
const claseEtiqueta = 'block text-xs font-semibold text-gray-600';

const ETIQUETAS: Record<Tipo, { nombre: string; icono: typeof Megaphone; clase: string }> = {
  convocatoria: { nombre: 'Convocatoria', icono: Megaphone, clase: 'bg-pink-100 text-pink-800' },
  evento: { nombre: 'Evento para el calendario', icono: CalendarDays, clase: 'bg-blue-100 text-blue-800' },
  actualizacion: { nombre: 'Cambio de fecha', icono: RefreshCw, clase: 'bg-amber-100 text-amber-800' },
};

function TarjetaSugerencia({ sugerencia, categorias, onResuelta }: {
  sugerencia: Sugerencia;
  categorias: Categoria[];
  onResuelta: (id: string) => void;
}) {
  const [datos, setDatos] = useState(sugerencia.datos);
  const [categoriaId, setCategoriaId] = useState(() => categorias.find((c) => c.nombre === 'Festival del Medio Ambiente')?.id ?? '');
  const [trabajando, setTrabajando] = useState(false);
  const publicacion = sugerencia.publicaciones;
  const etiqueta = ETIQUETAS[sugerencia.tipo];

  const convocatoria = datos as DatosConvocatoria;
  const eventos = (datos as { eventos: EventoSugerido[] }).eventos ?? [];
  const actualizacion = datos as DatosActualizacion;

  const cambiar = (campo: string, valor: string) => setDatos((actual) => ({ ...actual, [campo]: valor }));
  const cambiarEvento = (indice: number, campo: keyof EventoSugerido, valor: string) =>
    setDatos({ eventos: eventos.map((evento, i) => i === indice ? { ...evento, [campo]: valor } : evento) });
  const quitarEvento = (indice: number) => setDatos({ eventos: eventos.filter((_, i) => i !== indice) });

  async function marcar(estado: 'aprobada' | 'descartada') {
    const { error } = await supabase
      .from('sugerencias_ia')
      .update({ estado, datos, resuelta_en: new Date().toISOString() })
      .eq('id', sugerencia.id);
    if (error) throw error;
  }

  async function aprobar() {
    setTrabajando(true);
    try {
      if (sugerencia.tipo === 'convocatoria') {
        if (!convocatoria.titulo.trim()) throw new Error('La convocatoria necesita título.');
        const sinEnlace = !convocatoria.enlace_url.trim();
        const { error } = await supabase.from('convocatorias').insert({
          titulo: convocatoria.titulo.trim(),
          descripcion: (convocatoria.descripcion.trim() || convocatoria.titulo.trim()).slice(0, LIMITE_DESCRIPCION),
          imagen_url: publicacion?.imagen_url ?? '',
          // Sin enlace de registro, el botón lleva a la publicación original
          enlace_url: convocatoria.enlace_url.trim() || publicacion?.enlace_url || null,
          texto_boton: sinEnlace && publicacion?.enlace_url ? 'Más información' : null,
          fecha_cierre: convocatoria.fecha_cierre || null,
          activo: true,
        });
        if (error) throw error;
      } else if (sugerencia.tipo === 'evento') {
        const validos = eventos.filter((evento) => evento.titulo.trim() && evento.fecha);
        if (validos.length === 0) throw new Error('Cada evento necesita título y fecha.');
        const { error } = await supabase.from('eventos_calendario').insert(validos.map((evento) => ({
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
      } else {
        if (!actualizacion.nueva_fecha_cierre) throw new Error('Indica la nueva fecha límite.');
        const { error } = await supabase
          .from('convocatorias')
          .update({ fecha_cierre: actualizacion.nueva_fecha_cierre })
          .eq('id', actualizacion.convocatoria_id);
        if (error) throw error;
      }

      await marcar('aprobada');
      toast.success(
        sugerencia.tipo === 'convocatoria' ? 'Convocatoria publicada.'
          : sugerencia.tipo === 'evento' ? 'Agregado al calendario.'
            : 'Fecha límite actualizada.',
      );
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

  return (
    <article className="grid gap-4 rounded-xl border border-gray-200 p-4 md:grid-cols-[140px_1fr]">
      <div className="space-y-2">
        {publicacion && (
          <a href={publicacion.enlace_url ?? undefined} target="_blank" rel="noreferrer" title="Ver la publicación original" className="block">
            <img src={publicacion.imagen_url} alt="" className="aspect-square w-full rounded-lg object-cover" />
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
              <div key={indice} className="grid gap-2 rounded-lg bg-gray-50 p-3 sm:grid-cols-[2fr_1.2fr_1fr_1fr_auto]">
                <label className={claseEtiqueta}>Título
                  <input value={evento.titulo} onChange={(e) => cambiarEvento(indice, 'titulo', e.target.value)} maxLength={150} className={claseInput} />
                </label>
                <label className={claseEtiqueta}>Fecha
                  <input type="date" value={evento.fecha} onChange={(e) => cambiarEvento(indice, 'fecha', e.target.value)} className={claseInput} />
                </label>
                <label className={claseEtiqueta}>Inicio
                  <input type="time" value={evento.hora_inicio} onChange={(e) => cambiarEvento(indice, 'hora_inicio', e.target.value)} className={claseInput} />
                </label>
                <label className={claseEtiqueta}>Fin
                  <input type="time" value={evento.hora_fin} onChange={(e) => cambiarEvento(indice, 'hora_fin', e.target.value)} className={claseInput} />
                </label>
                <button type="button" onClick={() => quitarEvento(indice)} className="self-end rounded-lg p-2 text-gray-400 hover:bg-white hover:text-red-600" title="Quitar este evento">
                  <Trash2 className="h-4 w-4" />
                </button>
                <label className={`${claseEtiqueta} sm:col-span-5`}>Lugar
                  <input value={evento.lugar} onChange={(e) => cambiarEvento(indice, 'lugar', e.target.value)} maxLength={200} className={claseInput} />
                </label>
              </div>
            ))}
            <label className={`${claseEtiqueta} max-w-xs`}>Categoría del calendario
              <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={`${claseInput} bg-white`}>
                <option value="">Sin categoría</option>
                {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
              </select>
            </label>
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

        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={aprobar} disabled={trabajando} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
            {trabajando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {sugerencia.tipo === 'convocatoria' ? 'Publicar convocatoria' : sugerencia.tipo === 'evento' ? 'Agregar al calendario' : 'Cambiar fecha'}
          </button>
          <button type="button" onClick={descartar} disabled={trabajando} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-60">
            <X className="h-4 w-4" /> Descartar
          </button>
        </div>
      </div>
    </article>
  );
}

export default function SugerenciasIA({ version }: { version: number }) {
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [disponible, setDisponible] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      const [{ data, error }, { data: dataCategorias }] = await Promise.all([
        supabase
          .from('sugerencias_ia')
          .select('id, tipo, datos, motivo, origen, publicaciones(imagen_url, texto, enlace_url, red_social, fecha_publicacion)')
          .eq('estado', 'pendiente')
          .order('created_at', { ascending: false }),
        supabase.from('calendario_categorias').select('id, nombre').order('orden'),
      ]);
      // La tabla no existe si aún no se corre database/26_sugerencias_ia.sql
      if (error) {
        setDisponible(false);
        return;
      }
      setSugerencias((data || []) as unknown as Sugerencia[]);
      setCategorias((dataCategorias || []) as Categoria[]);
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
          Publicaciones de FDMA que parecen convocatorias, eventos o cambios de fecha. Revisa los datos (la IA puede equivocarse) y apruébalas con un clic.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {sugerencias.map((sugerencia) => (
          <TarjetaSugerencia
            key={sugerencia.id}
            sugerencia={sugerencia}
            categorias={categorias}
            onResuelta={(id) => setSugerencias((actuales) => actuales.filter((item) => item.id !== id))}
          />
        ))}
      </CardContent>
    </Card>
  );
}
