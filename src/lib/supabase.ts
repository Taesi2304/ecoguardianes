import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase en el archivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Para que un admin cree cuentas de otras personas: signUp con el cliente normal
// cambia la sesión del admin por la de la cuenta nueva. Este no guarda sesión.
export const supabaseRegistro = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'sb-registro-admin' },
});
