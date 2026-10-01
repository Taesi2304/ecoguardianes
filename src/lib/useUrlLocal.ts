import { useEffect, useMemo } from 'react';

// URL temporal para previsualizar un archivo aún no subido; se libera al cambiarlo o quitarlo
export function useUrlLocal(archivo: File | null) {
  const url = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return url;
}
