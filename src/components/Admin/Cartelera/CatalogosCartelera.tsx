import type { Catalogo } from '@/components/Cartelera/cartelera';
import { EditorCatalogo } from '../EditorCatalogo';

interface Props {
  tipos: Catalogo[];
  grupos: Catalogo[];
  onCambio: () => void;
}

export function CatalogosCartelera({ tipos, grupos, onCambio }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <EditorCatalogo
        titulo="Tipos de actividad"
        descripcion="Filtros de arriba (Taller, Ponencia...). El color se usa en la etiqueta."
        tabla="cartelera_tipos"
        items={tipos}
        avisoEliminar="Los participantes que lo usan quedarán sin tipo."
        onCambio={onCambio}
      />
      <EditorCatalogo
        titulo="Grupos"
        descripcion="Barra inferior (Colectivos, Ponentes...). El orden de la lista es el de la barra."
        tabla="cartelera_grupos"
        items={grupos}
        avisoEliminar="Los participantes que lo usan quedarán sin grupo."
        onCambio={onCambio}
      />
    </div>
  );
}
