import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AuthGuard() {
  const [verificando, setVerificando] = useState(true);
  const [sesionActiva, setSesionActiva] = useState(false);

  useEffect(() => {
    const verificarSesion = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSesionActiva(Boolean(user));
      setVerificando(false);
    };

    verificarSesion();
  }, []);

  if (verificando) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 text-gray-600">
        <Loader2 className="h-7 w-7 animate-spin text-green-600" />
        Verificando sesión...
      </div>
    );
  }

  return sesionActiva ? <Outlet /> : <Navigate to="/acceso?modo=login" replace />;
}
