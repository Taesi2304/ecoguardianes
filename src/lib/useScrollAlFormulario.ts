import { useEffect, useRef } from 'react';

// Lleva a la vista el formulario de alta/edición del admin cada vez que se abre
// o se cambia el registro que se edita
export function useScrollAlFormulario(abierto: boolean, editandoId: string | null) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (abierto) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [abierto, editandoId]);

  return ref;
}
