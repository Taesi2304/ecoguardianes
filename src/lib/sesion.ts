import { supabase } from './supabase';

// Pantalla inicial según el rol; null si la cuenta no está en la tabla usuarios
export async function rutaInicioDe(authUserId: string) {
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('roles(nombre)')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) throw error;
  if (!usuario) return null;

  const rol = ((usuario.roles as any)?.[0] || (usuario.roles as any))?.nombre;
  return rol === 'Super Admin' ? '/admin/pagina' : rol === 'Administrador' ? '/admin' : '/dashboard';
}
