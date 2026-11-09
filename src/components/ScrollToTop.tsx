import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Al cambiar de página sube al inicio; si el enlace trae #seccion (p. ej. /info#recursos)
// baja a esa sección. Se reintenta unos instantes porque la sección puede tardar en pintarse.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }

    let intentos = 0;
    let temporizador: number;
    const buscarSeccion = () => {
      const seccion = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (seccion) seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else if (intentos++ < 20) temporizador = window.setTimeout(buscarSeccion, 50);
    };
    buscarSeccion();

    return () => window.clearTimeout(temporizador);
  }, [pathname, hash]);

  return null;
}
