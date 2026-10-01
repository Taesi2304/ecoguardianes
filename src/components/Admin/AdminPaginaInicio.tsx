import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertCircle, ChevronDown, ExternalLink, Loader2, Save, Undo2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type SeccionVisible =
  | 'mostrar_cartelera' | 'mostrar_talleres' | 'mostrar_calendario'
  | 'mostrar_convocatorias' | 'mostrar_publicaciones' | 'mostrar_aliados';

// Los interruptores de módulos cuyo SQL aún no se corre simplemente no llegan de la base y no se muestran
type PaginaInicio = {
  titulo: string;
  subtitulo: string;
  descripcion: string;
} & Partial<Record<SeccionVisible, boolean>>;

const SECCIONES: { campo: SeccionVisible; nombre: string; detalle: string }[] = [
  { campo: 'mostrar_cartelera', nombre: 'Cartelera del festival', detalle: 'Banner y botón "Ver Cartelera" (actívalo cuando la cartelera esté lista)' },
  { campo: 'mostrar_talleres', nombre: 'Próximos talleres', detalle: 'Tarjetas de talleres extraordinarios con registro' },
  { campo: 'mostrar_calendario', nombre: 'Esta semana', detalle: 'Actividades de los próximos 7 días del calendario' },
  { campo: 'mostrar_convocatorias', nombre: 'Convocatorias', detalle: 'Tarjetas de convocatorias activas' },
  { campo: 'mostrar_publicaciones', nombre: 'Comunidad FDMA en Acción', detalle: 'Publicaciones de Facebook e Instagram' },
  { campo: 'mostrar_aliados', nombre: 'Aliados', detalle: 'Carrusel de aliados de la comunidad' },
];

const LIMITE_DESCRIPCION = 400;

const TEXTOS: { campo: 'titulo' | 'subtitulo' | 'descripcion'; nombre: string }[] = [
  { campo: 'titulo', nombre: 'Título' },
  { campo: 'subtitulo', nombre: 'Subtítulo' },
  { campo: 'descripcion', nombre: 'Descripción' },
];

// Lista legible de lo que cambió respecto a lo guardado, para confirmar antes de publicar
function describirCambios(original: PaginaInicio, actual: PaginaInicio) {
  const cambios: string[] = [];
  for (const { campo, nombre } of SECCIONES) {
    if (campo in actual && !!original[campo] !== !!actual[campo]) cambios.push(`${actual[campo] ? 'Mostrar' : 'Ocultar'} «${nombre}»`);
  }
  for (const { campo, nombre } of TEXTOS) {
    if (original[campo].trim() !== actual[campo].trim()) cambios.push(`Cambiar ${nombre.toLowerCase()}`);
  }
  return cambios;
}

export default function AdminPaginaInicio() {
  const [pagina, setPagina] = useState<PaginaInicio | null>(null);
  const [original, setOriginal] = useState<PaginaInicio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarPagina = async () => {
      const { data, error: errorConsulta } = await supabase
        .from('pagina_inicio')
        .select('*')
        .eq('id', 1)
        .single();

      if (errorConsulta) {
        setError('No se pudo cargar la configuración de la página.');
        console.error(errorConsulta);
      } else {
        setPagina(data as PaginaInicio);
        setOriginal(data as PaginaInicio);
      }
      setCargando(false);
    };

    cargarPagina();
  }, []);

  function manejarCambio(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setPagina((actual) => actual && { ...actual, [name]: value });
  }

  function alternarSeccion(campo: SeccionVisible) {
    setPagina((actual) => actual && { ...actual, [campo]: !actual[campo] });
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!pagina || !original) return;
    if (!pagina.titulo.trim() || !pagina.descripcion.trim()) {
      toast.error('Completa el título y la descripción.');
      return;
    }
    const cambios = describirCambios(original, pagina);
    if (cambios.length === 0) return;
    // Los cambios se publican al instante en la página pública
    if (!window.confirm(`Estos cambios se verán de inmediato en la página pública:\n\n• ${cambios.join('\n• ')}\n\n¿Publicarlos?`)) return;

    setGuardando(true);
    // Solo los interruptores existentes; los ajustes de la cartelera se guardan en su propio panel
    const interruptores = Object.fromEntries(
      SECCIONES.filter(({ campo }) => campo in pagina).map(({ campo }) => [campo, pagina[campo]]),
    );
    const { error: errorGuardado } = await supabase
      .from('pagina_inicio')
      .update({
        ...interruptores,
        titulo: pagina.titulo.trim(),
        subtitulo: pagina.subtitulo.trim(),
        descripcion: pagina.descripcion.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (errorGuardado) {
      console.error(errorGuardado);
      toast.error('No se pudieron guardar los cambios.');
    } else {
      toast.success('Página de inicio actualizada.');
      setOriginal(pagina);
    }
    setGuardando(false);
  }

  if (cargando) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>;
  }

  if (!pagina) {
    return <div className="mx-auto flex max-w-4xl items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700"><AlertCircle className="h-5 w-5" />{error}</div>;
  }

  const cambios = original ? describirCambios(original, pagina) : [];
  const hayCambios = cambios.length > 0;

  return (
    <form onSubmit={guardar} className="mx-auto max-w-4xl space-y-8 py-2 sm:py-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 border-b border-[#4A2E18]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Página de inicio</h1>
          <p className="mt-1 font-medium text-green-700">Textos y secciones de la página pública del festival</p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
          <ExternalLink className="h-4 w-4" /> Ver página
        </a>
      </div>

      <Card className="border-transparent bg-white shadow-sm">
        <CardHeader className="border-b bg-gray-50/50 px-6 py-4"><CardTitle className="text-lg text-gray-800">Secciones visibles</CardTitle></CardHeader>
        <CardContent className="divide-y divide-gray-100 p-0">
          {SECCIONES.filter(({ campo }) => campo in pagina).map(({ campo, nombre, detalle }) => (
            <div key={campo} className="flex items-center justify-between gap-4 px-6 py-4">
              <div>
                <p className="font-semibold text-gray-900">{nombre}</p>
                <p className="text-sm text-gray-500">{detalle}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!pagina[campo]}
                aria-label={`Mostrar ${nombre}`}
                onClick={() => alternarSeccion(campo)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${pagina[campo] ? 'bg-green-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${pagina[campo] ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Plegado: se edita poco y un cambio accidental se ve en la portada */}
      <details className="group rounded-xl bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-6 py-4 hover:bg-gray-50">
          <span>
            <span className="block text-lg font-semibold text-gray-800">Textos de la portada</span>
            <span className="block text-sm text-gray-500">Título, subtítulo y descripción. Normalmente no hace falta cambiarlos.</span>
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-5 border-t px-6 pb-6 pt-5">
          <label className="block text-sm font-semibold text-gray-700">Título
            <input name="titulo" value={pagina.titulo} onChange={manejarCambio} maxLength={80} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" />
          </label>
          <label className="block text-sm font-semibold text-gray-700">Subtítulo (en verde)
            <input name="subtitulo" value={pagina.subtitulo} onChange={manejarCambio} maxLength={80} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" />
          </label>
          <label className="block text-sm font-semibold text-gray-700">Descripción
            <textarea name="descripcion" value={pagina.descripcion} onChange={manejarCambio} maxLength={LIMITE_DESCRIPCION} rows={4} className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" />
            <span className={`mt-1 block text-right text-xs font-medium ${pagina.descripcion.length >= LIMITE_DESCRIPCION ? 'text-red-600' : 'text-gray-500'}`}>
              {pagina.descripcion.length} / {LIMITE_DESCRIPCION} caracteres permitidos
            </span>
          </label>
        </div>
      </details>

      {/* Barra fija mientras haya cambios sin publicar */}
      <div className={`sticky bottom-4 flex flex-col gap-3 rounded-2xl border p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between ${hayCambios ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'}`}>
        <p className={`text-sm font-medium ${hayCambios ? 'text-amber-800' : 'text-gray-500'}`}>
          {hayCambios ? `Cambios sin publicar: ${cambios.join(', ')}` : 'Sin cambios pendientes. Lo que ves es lo que está publicado.'}
        </p>
        <div className="flex shrink-0 gap-2">
          {hayCambios && (
            <button type="button" onClick={() => setPagina(original)} disabled={guardando} className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <Undo2 className="h-4 w-4" /> Descartar
            </button>
          )}
          <button type="submit" disabled={guardando || !hayCambios} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
            {guardando ? <><Loader2 className="h-4 w-4 animate-spin" /> Publicando...</> : <><Save className="h-4 w-4" /> Publicar cambios</>}
          </button>
        </div>
      </div>
    </form>
  );
}
