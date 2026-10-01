import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { Calendar, Loader2, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CAMPOS_VISITA, formatearCantidad, sumarPorUnidad, type VisitaBitacora } from '@/lib/bitacora';
import DetalleVisita from './DetalleVisita';

interface VisitaHistorial extends VisitaBitacora {
  usuarios: { nombre: string; apellido_paterno: string | null } | null;
  composteros: { nombre: string } | null;
}

type Vista = 'mios' | 'comunidad';

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

export default function MiHistorial() {
  const [historial, setHistorial] = useState<VisitaHistorial[]>([]);
  const [nombreColonia, setNombreColonia] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [imagenSeleccionada, setImagenSeleccionada] = useState<string | null>(null);
  const [usuarioActualId, setUsuarioActualId] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>('mios');

  useEffect(() => {
    cargarHistorial();
  }, []);

  useEffect(() => {
    const manejarTecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setImagenSeleccionada(null);
      }
    };

    window.addEventListener('keydown', manejarTecla);

    return () => {
      window.removeEventListener('keydown', manejarTecla);
    };
  }, []);

  const cargarHistorial = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id, colonia_id, colonias(nombre)')
        .eq('auth_user_id', user.id)
        .single();

      if (!usuario) return;
      setUsuarioActualId(usuario.id);

      const colonia = Array.isArray(usuario.colonias) ? usuario.colonias[0] : usuario.colonias;
      setNombreColonia((colonia as { nombre?: string } | null)?.nombre || '');

      // Todas las visitas de los composteros de su colonia (puede haber más de uno)
      let query = supabase
        .from('visitas')
        .select(`
          ${CAMPOS_VISITA},
          usuarios ( nombre, apellido_paterno ),
          composteros!inner ( nombre, colonia_id ),
          evidencias ( url_publica )
        `)
        .is('deleted_at', null)
        .order('fecha', { ascending: false });

      query = usuario.colonia_id
        ? query.eq('composteros.colonia_id', usuario.colonia_id)
        : query.eq('usuario_id', usuario.id);

      const { data: visitas, error: errorVisitas } = await query;
      if (errorVisitas) throw errorVisitas;

      setHistorial((visitas as unknown as VisitaHistorial[]) || []);
    } catch (err) {
      console.error("Error al cargar historial:", err);
      setError(true);
    } finally {
      setCargando(false);
    }
  };

  const historialVisible = vista === 'mios'
    ? historial.filter((visita) => visita.usuario_id === usuarioActualId)
    : historial;

  const totales = sumarPorUnidad(historialVisible);
  const ultimaVisita = historialVisible[0]?.fecha;

  const porMes = historialVisible.reduce((grupos, visita) => {
    const mes = capitalizar(format(new Date(visita.fecha), 'MMMM yyyy', { locale: es }));
    grupos.set(mes, [...(grupos.get(mes) || []), visita]);
    return grupos;
  }, new Map<string, VisitaHistorial[]>());

  if (cargando) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600">Cargando tu historial...</span>
      </div>
    );
  }

  const estadisticas = [
    { titulo: 'Kilos aportados', valor: formatearCantidad(totales.kg, 'kg'), visible: true },
    { titulo: 'Litros aportados', valor: formatearCantidad(totales.litros, 'litros'), visible: totales.litros > 0 },
    { titulo: 'Visitas', valor: String(historialVisible.length), visible: true },
    {
      titulo: 'Última visita',
      valor: ultimaVisita ? formatDistanceToNow(new Date(ultimaVisita), { addSuffix: true, locale: es }) : '—',
      visible: true,
    },
  ].filter((dato) => dato.visible);

  return (
    <div className="max-w-4xl mx-auto py-2 sm:py-4">
      <div className="flex items-center gap-3 sm:gap-4 mb-6 border-b pb-5">
        <div className="bg-[#CFE9D6] rounded-full p-3 flex items-center justify-center shrink-0">
          <img src="/historial.svg" alt="" aria-hidden="true" className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight break-words">Historial de bitácoras</h1>
          <p className="text-base sm:text-lg text-gray-500 mt-1">
            {nombreColonia ? `Composteros de ${nombreColonia}` : 'Actualizaciones y monitoreo'}
          </p>
        </div>
      </div>

      <div role="tablist" aria-label="Qué registros mostrar" className="mb-6 inline-flex w-full rounded-xl bg-gray-100 p-1 sm:w-auto">
        {([['mios', 'Mis registros'], ['comunidad', 'Comunidad']] as const).map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={vista === valor}
            onClick={() => setVista(valor)}
            className={`flex-1 rounded-lg px-5 py-2 text-sm font-semibold transition sm:flex-none ${
              vista === valor ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700">
          No se pudo cargar el historial. Revisa tu conexión y recarga la página.
        </div>
      )}

      {historialVisible.length > 0 && (
        <div className={`mb-8 grid grid-cols-2 gap-3 ${estadisticas.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
          {estadisticas.map((dato) => (
            <div key={dato.titulo} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{dato.titulo}</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{dato.valor}</p>
            </div>
          ))}
        </div>
      )}

      {historialVisible.length === 0 ? (
        <Card className="bg-gray-50 border-dashed border-2">
          <CardContent className="flex flex-col items-center text-center py-12">
            <img src="/planta-tierra.svg" alt="" aria-hidden="true" className="mb-4 h-16 w-16 object-contain opacity-80" />
            <p className="text-lg font-medium text-gray-600">
              {vista === 'mios' ? 'Aún no tienes registros.' : 'Aún no hay registros en tu colonia.'}
            </p>
            <Link to="/dashboard/Nueva-Bitacora" className="mt-4 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-bold text-white no-underline hover:bg-green-700 hover:no-underline">
              Registrar mi primera visita
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {Array.from(porMes).map(([mes, visitas]) => (
            <section key={mes}>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#4A2E18]">{mes}</h2>
              <div className="space-y-5">
                {visitas.map((visita) => {
                  const esMia = visita.usuario_id === usuarioActualId;
                  const autor = visita.usuarios;

                  return (
                    <Card key={visita.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardHeader className="border-b border-gray-100 bg-transparent px-5 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                              <Calendar className="h-4 w-4 shrink-0 text-green-600" />
                              <span className="capitalize">
                                {new Date(visita.fecha).toLocaleString('es-MX', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              {esMia ? (
                                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-green-800">
                                  Tu registro
                                </span>
                              ) : (
                                <span className="font-semibold text-gray-700">
                                  {autor ? `${autor.nombre} ${autor.apellido_paterno || ''}`.trim() : 'Eco Guardián'}
                                </span>
                              )}
                              {visita.composteros?.nombre && <span>· {visita.composteros.nombre}</span>}
                            </div>
                          </div>

                          <span className="w-fit shrink-0 whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                            +{formatearCantidad(visita.cantidad_material, visita.unidad_medida)}
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-4">
                        <DetalleVisita visita={visita} onVerFoto={setImagenSeleccionada} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {imagenSeleccionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setImagenSeleccionada(null)}
        >
          <div className="relative max-w-4xl w-full flex items-center justify-center">
            <button
              type="button"
              onClick={() => setImagenSeleccionada(null)}
              className="absolute -top-3 right-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-lg transition hover:bg-white"
              aria-label="Cerrar vista previa"
            >
              <X className="h-5 w-5" />
            </button>

            <img
              src={imagenSeleccionada}
              alt="Evidencia del compostero en tamaño completo"
              className="max-h-[80vh] w-full max-w-full rounded-2xl object-contain shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
