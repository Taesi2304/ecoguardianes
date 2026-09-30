import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Filter, Loader2, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function MiHistorial() {
  const [historial, setHistorial] = useState<any[]>([]);
  const [nombreCompostero, setNombreCompostero] = useState("Cargando tu compostero...");
  const [cargando, setCargando] = useState(true);
  const [imagenSeleccionada, setImagenSeleccionada] = useState<string | null>(null);
  const [usuarioActualId, setUsuarioActualId] = useState<string | null>(null);
  const [mostrarSoloMios, setMostrarSoloMios] = useState(true);

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
      // 1. Saber quién está logueado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Traer los datos del usuario para saber su colonia
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id, colonia_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!usuario) return;
      setUsuarioActualId(usuario.id);

      // 3. Traer el nombre real de su compostero asignado
      const { data: compostero } = await supabase
        .from('composteros')
        .select('id, nombre')
        .eq('colonia_id', usuario.colonia_id)
        .single();

      if (compostero) {
        setNombreCompostero(`Bitácora: ${compostero.nombre}`);
        
        // 4. Traer todas las visitas de ESE compostero, ordenadas por la más reciente
        // Y de paso, le pedimos a Supabase que traiga las URLs de las fotos de la tabla evidencias
        const { data: visitas } = await supabase
          .from('visitas')
          .select(`
            id,
            usuario_id,
            fecha, 
            cantidad_material, 
            unidad_medida,
            observaciones,
            usuarios ( nombre, apellido_paterno ),
            evidencias ( url_publica )
          `)
          .eq('compostero_id', compostero.id)
          .order('fecha', { ascending: false });

        if (visitas) {
          setHistorial(visitas);
        }
      }
    } catch (error) {
      console.error("Error al cargar historial:", error);
    } finally {
      setCargando(false);
    }
  };

  const historialVisible = mostrarSoloMios
    ? historial.filter((visita) => visita.usuario_id === usuarioActualId)
    : historial;

  if (cargando) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600">Cargando tu historial...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-2 sm:py-4">
      <div className="flex items-center gap-3 sm:gap-4 mb-8 border-b pb-5">
        <div className="bg-[#CFE9D6] rounded-full p-3 flex items-center justify-center shrink-0">
          <img src="/historial.svg" alt="Planta" className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />
        </div>
        <div className="min-w-0">
          {/* Aquí se pone dinámicamente el nombre de TU compostero asignado */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight break-words">{nombreCompostero}</h1>
          <p className="text-lg sm:text-xl text-gray-500 mt-2">Historial de actualizaciones y monitoreo</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {historialVisible.length} registro{historialVisible.length === 1 ? '' : 's'} mostrado{historialVisible.length === 1 ? '' : 's'}
        </p>
        <div className="flex flex-col items-end gap-2">
          <p className="text-right text-sm text-gray-600">Filtrar por:</p>
          <button
            type="button"
            aria-pressed={mostrarSoloMios}
            onClick={() => setMostrarSoloMios((actual) => !actual)}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              mostrarSoloMios
                ? 'border-green-700 bg-green-700 text-white hover:bg-green-800'
                : 'border-green-200 bg-white text-green-700 hover:bg-green-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            {mostrarSoloMios ? 'Mostrar historial comunal' : 'Mostrar mis cambios'}
          </button>
        </div>
      </div>

      {historialVisible.length === 0 ? (
        <Card className="bg-gray-50 border-dashed border-2">
          <CardContent className="flex flex-col items-center text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-600">
              {mostrarSoloMios ? 'Aún no tienes registros en este compostero.' : 'Aún no hay registros en este compostero.'}
            </p>
            <p className="text-gray-400">
              {mostrarSoloMios ? 'Cambia el filtro para mostrar el historial comunal.' : 'Ve a "Nueva Bitácora" para hacer tu primera actualización.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {historialVisible.map((visita) => {
            const autor = Array.isArray(visita.usuarios) ? visita.usuarios[0] : visita.usuarios;

            return (
            <Card key={visita.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="border-b border-gray-100 bg-transparent px-5 py-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                
                {/* Columna Izquierda: Fecha, Hora y Etiqueta */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm">
                    <Calendar className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="capitalize">
                      {new Date(visita.fecha).toLocaleString('es-MX', {
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                  
                  <div className="min-w-0">
                    {autor?.nombre ? (
                      <span className="inline-flex items-center bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full text-[11px] uppercase font-bold tracking-wider">
                        Tu registro
                      </span>
                    ) : (
                      <span className="inline-flex items-center bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full text-[11px] uppercase font-bold tracking-wider">
                        Aporte de un Eco Guardián
                      </span>
                    )}
                  </div>
                </div>

                {/* Columna Derecha: Cantidad Aportada */}
                <div className="shrink-0 pt-1 sm:pt-0">
                  <span className="bg-green-50 text-green-700 border border-green-200 text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap">
                    +{visita.cantidad_material} {visita.unidad_medida === 'litros' ? 'L' : 'kg'}
                  </span>
                </div>

              </div>
              </CardHeader>

              <CardContent className="pt-4">
              
                {/* Mostramos el texto que agrupamos antes */}
                <div className="whitespace-pre-wrap text-gray-700 text-sm mb-4">
                  {visita.observaciones}
                </div>

                {/* Si la visita tiene fotos (evidencias), las mostramos */}
                {visita.evidencias && visita.evidencias.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wider">Evidencias Fotográficas</p>
                    <div className="flex flex-wrap gap-3">
                      {visita.evidencias.map((evidencia: any, index: number) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setImagenSeleccionada(evidencia.url_publica)}
                          className="group overflow-hidden rounded-lg border shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          aria-label="Ver evidencia en tamaño completo"
                        >
                          <img
                            src={evidencia.url_publica}
                            alt="Evidencia del compostero"
                            className="h-24 w-24 object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })}
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