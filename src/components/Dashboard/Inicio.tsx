import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Copy, Leaf, MapPin } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

export default function Inicio() {
  const [datos, setDatos] = useState({
    nombre: "Eco Guardiana",
    apellidoPaterno: "",
    apellidoMaterno: "",
    compostero: "Cargando...",
    colonia: "",
    codigoColonia: "",
    codigoCompostero: ""
  });
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const cargarPerfil = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from('usuarios')
        .select(`
          nombre,
          apellido_paterno,
          apellido_materno,
          colonia_id,
          compostero_id,
          colonias ( nombre, codigo_acceso_colonia )
        `)
        .eq('auth_user_id', user.id)
        .single();

      if (usuario) {
        let compostero = null;

        if (usuario.compostero_id) {
          const { data: compEspecifico } = await supabase
            .from('composteros')
            .select('nombre, codigo')
            .eq('id', usuario.compostero_id)
            .maybeSingle();
          compostero = compEspecifico;
        }

        if (!compostero && usuario.colonia_id) {
          const { data: compColonia } = await supabase
            .from('composteros')
            .select('nombre, codigo')
            .eq('colonia_id', usuario.colonia_id)
            .eq('activo', true)
            .limit(1)
            .maybeSingle();
          compostero = compColonia;
        }

        setDatos({
          nombre: usuario.nombre,
          apellidoPaterno: usuario.apellido_paterno || "",
          apellidoMaterno: usuario.apellido_materno || "",
          // @ts-ignore - Evitamos error de tipado rápido por el join de Supabase
          colonia: usuario.colonias?.nombre || "Tu Colonia",
          // @ts-ignore
          codigoColonia: usuario.colonias?.codigo_acceso_colonia || "Sin código",
          compostero: compostero?.nombre || "Compostero no asignado",
          codigoCompostero: compostero?.codigo || "Sin código"
        });
      }
    };

    cargarPerfil();
  }, []);

  const nombreCompleto = [datos.nombre, datos.apellidoPaterno, datos.apellidoMaterno]
    .filter(Boolean)
    .join(' ')
    .trim() || datos.nombre;

  const copiarCodigo = async () => {
    if (!datos.codigoColonia) return;

    try {
      await navigator.clipboard.writeText(datos.codigoColonia);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch (error) {
      console.error('No se pudo copiar el código:', error);
    }
  };

  return (

    <div className="max-w-4xl mx-auto py-2 sm:py-4">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 break-words">¡Hola, {nombreCompleto}! </h1>
      <p className="text-lg text-gray-600 mb-8 sm:mb-12">Bienvenido a ECO-GUARDIANES. </p>

      <Card className="bg-green-50 border-green-200 shadow-sm">
        <CardContent className="p-6">
          
         <div className="flex flex-col md:flex-row items-center md:items-center gap-6">
         <div className="shrink-0 flex items-center justify-center w-22 h-22 md:w-28 md:h-28">
        <img src="/logo.svg" alt="Compostero" className="w-full h-full object-contain" />
        </div>
        
        <div className="w-full text-center md:text-left">
        <h2 className="text-2xl font-bold text-green-900 mb-3">
        Compostero: {datos.compostero}
    </h2>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-green-800">
                <div className="flex items-center gap-2 font-medium bg-white/40 rounded-lg px-3 py-2">
                  <MapPin className="h-4 w-4" />
                  <span>Colonia: {datos.colonia}</span>
                </div>

                <div className="bg-white/40 rounded-lg px-3 py-2">
                  <strong>Código de acceso:</strong> {datos.codigoColonia}
                </div>

                {/* <div className="bg-white/40 rounded-lg px-3 py-2 md:col-span-2">
                  <strong>Código del compostero:</strong> {datos.codigoCompostero}
                </div> */}
              </div>

              <div className="mt-4 rounded-xl border border-green-200 bg-white/70 p-3 text-sm text-green-900 font-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span>
                  “Invita a alguien a unirse con este código de colonia: {datos.codigoColonia}”
                </span>

                <button
                  type="button"
                  onClick={copiarCodigo}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiado ? '¡Copiado!' : 'Copiar código'}
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

<div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"> 
  
  {/* Tarjeta 1: Actualizar Bitácora (Acción Principal) */}
  <Link to="/dashboard/Nueva-Bitacora" className="block w-full no-underline hover:no-underline">
    <Card className="hover:shadow-md transition-all border-dashed border-2 border-green-400 bg-green-50/30 cursor-pointer h-full">
      <CardContent className="p-6 flex flex-col items-center text-center">
        <img src="/bitacora.svg" alt="Actualizar Bitácora" className="h-10 w-10 mb-3" />
        <h3 className="font-semibold text-gray-800">Actualizar Bitácora</h3>
        <p className="text-sm text-gray-500 mt-2">Registra tu monitoreo semanal del compostero.</p>
      </CardContent>
    </Card>
  </Link>

  {/* Tarjeta 2: Mi Historial */}
  <Link to="/dashboard/Mi-Historial" className="block w-full no-underline hover:no-underline">
    <Card className="hover:shadow-md transition-all border-solid border border-gray-200 cursor-pointer h-full">
      <CardContent className="p-6 flex flex-col items-center text-center">
        <img src="/historial.svg" alt="Historial" className="h-10 w-10 mb-3" />
        <h3 className="font-semibold text-gray-800">Historial</h3>
        <p className="text-sm text-gray-500 mt-2">Explora tu historial de aportes y el progreso de la comunidad.</p>
      </CardContent>
    </Card>
  </Link>

  {/* Tarjeta 3: Comunidad */}
  <Link to="/dashboard/Comunidad" className="block w-full no-underline hover:no-underline">
    <Card className="hover:shadow-md transition-all border-solid border border-gray-200 cursor-pointer h-full">
      <CardContent className="p-6 flex flex-col items-center text-center">
        <img src="/comunidad.svg" alt="Comunidad" className="h-10 w-10 mb-3" />
        <h3 className="font-semibold text-gray-800">Comunidad</h3>
        <p className="text-sm text-gray-500 mt-2">Conecta con otros Eco Guardianas y comparte experiencias.</p>
      </CardContent>
    </Card>
  </Link>

</div>


    </div>
  );
}