import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { rutaInicioDe } from '../../lib/sesion';
import '../Landing/Landing.css';

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Si ya hay sesión, no vuelve a pedir correo y contraseña
  useEffect(() => {
    let cancelado = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session || cancelado) return;
      const ruta = await rutaInicioDe(session.user.id).catch(() => null);
      if (ruta && !cancelado) navigate(ruta, { replace: true });
    });
    return () => { cancelado = true; };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu correo y contraseña para continuar.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) throw authError;

     if (data.user) {
        const ruta = await rutaInicioDe(data.user.id);

        // Si el usuario se autenticó pero no está en la tabla usuarios, se cierra la
        // sesión y se muestra el mismo mensaje genérico: no se revela que el correo existe.
        if (!ruta) {
          await supabase.auth.signOut();
          throw new Error('CREDENCIALES_INVALIDAS');
        }

        // Cada rol recibe su pantalla inicial correspondiente.
        navigate(ruta);
      }
    } catch (err) {
      // El detalle real va a la consola; al usuario siempre el mismo mensaje para no
      // delatar qué correos están registrados.
      console.error('Error detallado:', err);
      setError('Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page flex flex-col items-center justify-center px-4 pt-10 pb-12 sm:pt-16">
      
      <div className="bg-[#FFF8DF] border border-[#4A2E18]/10 shadow-sm rounded-xl p-3 mb-6">
        <img src="/logo.svg" alt="Logo" className="w-8 h-8 object-contain" />
      </div>

      <div className="text-center mb-6">
        <h2 className="section-title text-4xl mb-2">Bienvenida de nuevo</h2>
        <p className="text-[#4A2E18]/70 font-medium">Ingresa a tu cuenta de Eco Guardian</p>
      </div>

      <div className="w-full max-w-md bg-[#EBF3E8] border-[2px] border-dashed border-[#2D7A3E]/30 rounded-3xl p-6 sm:p-8 relative shadow-lg">
        <div className="testimonial-tape washi-tape-green" />

        <form onSubmit={handleLogin} className="space-y-4 mt-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold border border-red-200 text-center">
              {error}
            </div>
          )}

          <label className="contact-field block">
            <span className="contact-label text-[#2D7A3E]">Correo electrónico:</span>
            <input
              className="contact-input w-full mt-1 border-white focus:ring-2 focus:ring-[#2D7A3E]"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          </label>

          <label className="contact-field block">
            <span className="contact-label text-[#2D7A3E]">Contraseña:</span>
            <div className="relative">
              <input
                className="contact-input w-full mt-1 border-white focus:ring-2 focus:ring-[#2D7A3E] pr-11"
                type={mostrarPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2D7A3E] hover:text-[#235E30]"
                aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {mostrarPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </label>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2D7A3E] text-white py-3 px-6 rounded-full font-bold shadow-lg hover:bg-[#235E30] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Iniciando...' : 'Iniciar Sesión'}</span>
              {!loading && <LogIn className="w-5 h-5 ml-2" />}
            </button>
          </div>

          <div className="text-center mt-4">
            <button type="button" className="text-sm font-bold text-[#2D7A3E] hover:underline">
              ¿Olvidaste tu contraseña? Contacta a tu administrador.
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 text-center space-y-3">
        <p className="text-sm font-medium text-[#4A2E18]/70">
          ¿No sabes cómo iniciar sesión?{' '}
          <Link to="/manuales" className="text-[#2D7A3E] font-bold hover:underline">
            Consulta el manual
          </Link>
        </p>
        <p className="text-sm font-medium text-[#4A2E18]/70">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="text-[#2D7A3E] font-bold hover:underline">
            Regístrate aquí
          </Link>
        </p>
        <Link to="/" className="block text-sm font-medium text-[#4A2E18]/70 hover:text-[#4A2E18]">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
};