import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Rutas de administración de la página pública FDMA (solo Super Admin)
export default function SuperAdminGuard() {
    const [verificando, setVerificando] = useState(true);
    const [esSuperAdmin, setEsSuperAdmin] = useState(false);

    useEffect(() => {
        const verificarSuperAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: usuario } = await supabase
                    .from('usuarios')
                    .select('roles(nombre)')
                    .eq('auth_user_id', user.id)
                    .single();

                const roles = usuario?.roles as { nombre?: string } | { nombre?: string }[] | null;
                const rolNombre = Array.isArray(roles) ? roles[0]?.nombre : roles?.nombre;
                setEsSuperAdmin(rolNombre === 'Super Admin');
            }

            setVerificando(false);
        };

        verificarSuperAdmin();
    }, []);

    if (verificando) {
        return (
            <div className="flex h-64 items-center justify-center gap-2 text-gray-600">
                <Loader2 className="h-7 w-7 animate-spin text-green-600" />
                Verificando permisos...
            </div>
        );
    }

    return esSuperAdmin ? <Outlet /> : <Navigate to="/admin" replace />;
}
