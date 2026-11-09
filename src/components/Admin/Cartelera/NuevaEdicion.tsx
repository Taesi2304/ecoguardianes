import { useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import type { Edicion } from '@/components/Cartelera/cartelera';

interface Props {
  ediciones: Edicion[];
  onCerrar: () => void;
  onCreada: (edicionId: string) => Promise<void>;
}

const claseInput = 'mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal focus:border-green-500 focus:outline-none';

// Crea la edición del festival de otro año, opcionalmente con los participantes de una edición anterior
export function NuevaEdicion({ ediciones, onCerrar, onCreada }: Props) {
  const anioSugerido = Math.max(new Date().getFullYear(), ...ediciones.map((e) => e.anio + 1));
  const [anio, setAnio] = useState(String(anioSugerido));
  const [nombre, setNombre] = useState(`Festival del Medio Ambiente ${anioSugerido}`);
  const [nombreEditado, setNombreEditado] = useState(false);
  const [copiarDe, setCopiarDe] = useState(ediciones[0]?.id ?? '');
  const [marcarActual, setMarcarActual] = useState(false);
  const [guardando, setGuardando] = useState(false);

  function cambiarAnio(valor: string) {
    setAnio(valor);
    // Mientras no lo escriban a mano, el nombre sigue al año
    if (!nombreEditado) setNombre(`Festival del Medio Ambiente ${valor}`);
  }

  async function crear(e: FormEvent) {
    e.preventDefault();
    const anioNumero = Number(anio);
    if (ediciones.some((edicion) => edicion.anio === anioNumero)) {
      toast.error(`Ya existe la edición ${anioNumero}.`);
      return;
    }

    setGuardando(true);
    try {
      const { data, error } = await supabase
        .from('festival_ediciones')
        .insert({ anio: anioNumero, nombre: nombre.trim() })
        .select('id')
        .single();
      if (error) throw error;

      if (copiarDe) {
        const { data: copiados, error: errorCopia } = await supabase.rpc('copiar_participantes_edicion', { p_origen: copiarDe, p_destino: data.id });
        if (errorCopia) throw errorCopia;
        toast.success(`Se copiaron ${copiados} actividad(es). Agrega sus horarios de este año.`);
      }

      if (marcarActual) {
        const { error: errorActual } = await supabase.rpc('marcar_edicion_actual', { p_edicion: data.id });
        if (errorActual) throw errorActual;
      }

      toast.success(`Edición ${anioNumero} creada.`);
      await onCreada(data.id);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo crear la edición.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <form onSubmit={crear} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-bold text-gray-800">Nueva edición del festival</h2>
          <button type="button" onClick={onCerrar} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[7rem_1fr]">
            <label className="block text-sm font-semibold text-gray-700">Año
              <input type="number" min={2000} max={2100} required value={anio} onChange={(e) => cambiarAnio(e.target.value)} className={claseInput} />
            </label>
            <label className="block text-sm font-semibold text-gray-700">Nombre
              <input required maxLength={150} value={nombre} onChange={(e) => { setNombre(e.target.value); setNombreEditado(true); }} className={claseInput} />
            </label>
          </div>

          {ediciones.length > 0 && (
            <label className="block text-sm font-semibold text-gray-700">Copiar actividades de
              <select value={copiarDe} onChange={(e) => setCopiarDe(e.target.value)} className={`${claseInput} bg-white`}>
                <option value="">No copiar (empezar vacía)</option>
                {ediciones.map((edicion) => <option key={edicion.id} value={edicion.id}>Edición {edicion.anio}</option>)}
              </select>
              <span className="mt-1 block text-xs font-normal text-gray-500">Se copian nombre, fotos, descripción, tipo y grupo, pero <strong>sin horarios</strong>: esos se capturan de nuevo cada año. Después puedes borrar a quien no repita.</span>
            </label>
          )}

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={marcarActual} onChange={(e) => setMarcarActual(e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span>Mostrarla ya en la cartelera pública (marcarla como actual). Si todavía la estás preparando, déjalo sin marcar y márcala cuando esté lista.</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button type="button" onClick={onCerrar} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button type="submit" disabled={guardando} className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />} Crear edición
          </button>
        </div>
      </form>
    </div>
  );
}
