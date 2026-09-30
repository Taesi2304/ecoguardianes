import { useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Catalogo } from '@/components/Cartelera/cartelera';

interface EditorProps {
  titulo: string;
  descripcion: string;
  tabla: 'cartelera_tipos' | 'cartelera_grupos';
  items: Catalogo[];
  onCambio: () => void;
}

// Filas nuevas llevan id "nuevo-..." hasta guardarse
const esNuevo = (id: string) => id.startsWith('nuevo-');

function EditorCatalogo({ titulo, descripcion, tabla, items, onCambio }: EditorProps) {
  const [filas, setFilas] = useState<Catalogo[]>(items);
  const [guardando, setGuardando] = useState(false);

  function cambiar(id: string, campo: 'nombre' | 'color', valor: string) {
    setFilas((actuales) => actuales.map((fila) => fila.id === id ? { ...fila, [campo]: valor } : fila));
  }

  function agregar() {
    setFilas((actuales) => [...actuales, { id: `nuevo-${crypto.randomUUID()}`, nombre: '', color: '#2d6a4f', orden: actuales.length + 1 }]);
  }

  async function eliminar(fila: Catalogo) {
    if (esNuevo(fila.id)) {
      setFilas((actuales) => actuales.filter((item) => item.id !== fila.id));
      return;
    }
    if (!window.confirm(`¿Eliminar "${fila.nombre}"? Los participantes que lo usan quedarán sin ${tabla === 'cartelera_tipos' ? 'tipo' : 'grupo'}.`)) return;

    const { error } = await supabase.from(tabla).delete().eq('id', fila.id);
    if (error) {
      toast.error('No se pudo eliminar.');
      return;
    }
    setFilas((actuales) => actuales.filter((item) => item.id !== fila.id));
    onCambio();
  }

  async function guardar() {
    if (filas.some((fila) => !fila.nombre.trim())) {
      toast.error('Todos los elementos necesitan nombre.');
      return;
    }

    setGuardando(true);
    const datos = filas.map((fila, indice) => ({
      ...(esNuevo(fila.id) ? {} : { id: fila.id }),
      nombre: fila.nombre.trim(),
      color: fila.color,
      orden: indice + 1,
    }));
    const existentes = datos.filter((fila) => 'id' in fila);
    const nuevos = datos.filter((fila) => !('id' in fila));

    const resultados = await Promise.all([
      existentes.length > 0 ? supabase.from(tabla).upsert(existentes) : Promise.resolve({ error: null }),
      nuevos.length > 0 ? supabase.from(tabla).insert(nuevos) : Promise.resolve({ error: null }),
    ]);
    setGuardando(false);

    const error = resultados.find((resultado) => resultado.error)?.error;
    if (error) {
      console.error(error);
      toast.error(error.code === '23505' ? 'Hay nombres repetidos.' : 'No se pudieron guardar los cambios.');
      return;
    }
    toast.success(`${titulo} guardados.`);
    onCambio();
  }

  return (
    <Card className="border-transparent bg-white shadow-sm">
      <CardHeader className="border-b bg-gray-50/50 px-6 py-4">
        <CardTitle className="text-lg text-gray-800">{titulo}</CardTitle>
        <p className="text-sm text-gray-500">{descripcion}</p>
      </CardHeader>
      <CardContent className="space-y-3 p-6">
        {filas.map((fila) => (
          <div key={fila.id} className="flex items-center gap-2">
            <input type="color" value={fila.color} onChange={(e) => cambiar(fila.id, 'color', e.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-gray-300 p-1" aria-label="Color" />
            <input value={fila.nombre} onChange={(e) => cambiar(fila.id, 'nombre', e.target.value)} maxLength={60} placeholder="Nombre" aria-label="Nombre" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none" />
            <button onClick={() => eliminar(fila)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2">
          <button onClick={agregar} className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline"><Plus className="h-4 w-4" /> Agregar</button>
          <button onClick={guardar} disabled={guardando} className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  tipos: Catalogo[];
  grupos: Catalogo[];
  onCambio: () => void;
}

export function CatalogosCartelera({ tipos, grupos, onCambio }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <EditorCatalogo titulo="Tipos de actividad" descripcion="Filtros de arriba (Taller, Ponencia...). El color se usa en la etiqueta." tabla="cartelera_tipos" items={tipos} onCambio={onCambio} />
      <EditorCatalogo titulo="Grupos" descripcion="Barra inferior (Colectivos, Ponentes...). El orden de la lista es el de la barra." tabla="cartelera_grupos" items={grupos} onCambio={onCambio} />
    </div>
  );
}
