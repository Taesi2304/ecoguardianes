import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

const CADA_CUANTO = 5 * 60 * 1000;

async function hayVersionNueva() {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return false;
    const { version } = await res.json();
    return Boolean(version) && version !== __APP_VERSION__;
  } catch {
    return false;
  }
}

// Si alguien dejó la app abierta desde antes de un deploy, la actualiza:
// sola al cambiar de página (no hay formulario a medias que perder),
// o con el botón del aviso si se queda en la misma página.
export default function AvisoNuevaVersion() {
  const { pathname } = useLocation();
  const [nuevaVersion, setNuevaVersion] = useState(false);
  const [rutaAlDetectar, setRutaAlDetectar] = useState<string | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    const revisar = async () => {
      if (await hayVersionNueva()) setNuevaVersion(true);
    };
    const alVolver = () => {
      if (document.visibilityState === 'visible') revisar();
    };

    revisar();
    const intervalo = setInterval(revisar, CADA_CUANTO);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, []);

  useEffect(() => {
    if (!nuevaVersion) return;
    if (rutaAlDetectar === null) {
      setRutaAlDetectar(pathname);
    } else if (pathname !== rutaAlDetectar) {
      window.location.reload();
    }
  }, [nuevaVersion, pathname, rutaAlDetectar]);

  if (!nuevaVersion) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-green-200 bg-white p-4 shadow-lg">
      <RefreshCw className="h-5 w-5 shrink-0 text-green-700" />
      <p className="flex-1 text-sm text-gray-700">Hay una versión nueva de la página.</p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-800"
      >
        Actualizar
      </button>
    </div>
  );
}
