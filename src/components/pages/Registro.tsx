import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import '../Landing/Landing.css';

export const Registro = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [coloniaId, setColoniaId] = useState<string | null>(null);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    correo: '',
    telefono: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleValidarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // La base valida el código sin dejar ver los códigos de las demás colonias
      const { data, error: dbError } = await supabase.rpc('validar_codigo_colonia', { p_codigo: codigo.trim() });

      if (dbError || !data) {
        throw new Error('Código inválido o inactivo. Verifica con tu administrador.');
      }

      setColoniaId(data.id);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!coloniaId) {
        throw new Error('Primero valida el código de tu colonia.');
      }
      if (!aceptaTerminos) {
        throw new Error('Para crear tu cuenta debes aceptar los Términos y Condiciones y el Aviso de Privacidad.');
      }

      // --- VALIDACIÓN DE CONTRASEÑA ---
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
      if (!passwordRegex.test(formData.password)) {
        throw new Error('La contraseña debe tener al menos 6 caracteres, incluir una mayúscula y un número.');
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.correo,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario.');

      const { data: rolData, error: rolError } = await supabase
        .from('roles')
        .select('id')
        .eq('nombre', 'Eco Guardian')
        .single();

      if (rolError || !rolData) throw new Error('Error al asignar el rol.');

      const { error: insertError } = await supabase
        .from('usuarios')
        .insert([
          {
            id: authData.user.id,
            auth_user_id: authData.user.id,
            rol_id: rolData.id,
            colonia_id: coloniaId,
            // La base vuelve a revisar que el código corresponda a la colonia
            codigo_acceso: codigo.trim(),
            nombre: formData.nombre,
            apellido_paterno: formData.apellido_paterno,
            apellido_materno: formData.apellido_materno,
            correo: formData.correo,
            telefono: formData.telefono,
          }
        ]);

      if (insertError) throw insertError;

      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error durante el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page flex flex-col items-center justify-center px-4 pt-10 pb-12 sm:pt-16">
      
      <div className="bg-[#FFF8DF] border border-[#4A2E18]/10 shadow-sm rounded-xl p-3 mb-6">
        {step === 1 ? (
          <img 
            src="/usuarios.svg" /* Cambia esto por el nombre exacto de tu SVG de llave */
            alt="Código de acceso" 
            className="w-8 h-8 object-contain" 
          />
        ) : (
          <img 
            src="/logo.svg" /* Cambia esto por tu SVG de hojita o usuario */
            alt="Registro de usuario" 
            className="w-8 h-8 object-contain" 
          />
        )}
    
      </div>

      <div className="text-center mb-6">
        <h2 className="section-title text-4xl mb-2">
          {step === 1 ? 'Código de Acceso' : 'Crea tu cuenta'}
        </h2>
        <p className="text-[#4A2E18]/70 font-medium">
          {step === 1 
            ? 'Ingresa el código que te proporcionaron.' 
            : 'Completa tus datos para ser una Eco Guardian'}
        </p>
      </div>

      <div className="w-full max-w-md bg-[#EBF3E8] border-[2px] border-dashed border-[#2D7A3E]/30 rounded-3xl p-6 sm:p-8 relative shadow-lg">
        <div className={`testimonial-tape ${step === 1 ? 'washi-tape-beige' : 'washi-tape-green'}`} />

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold border border-red-200 mb-4 text-center">
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleValidarCodigo} className="mt-4">
            <label className="contact-field block">
              <span className="contact-label text-center text-lg block mb-2 text-[#2D7A3E]">Tu código:</span>
              <input
                className="contact-input w-full border-white focus:ring-2 focus:ring-[#E07A5F] outline-none text-center text-xl tracking-widest font-bold uppercase"
                type="text"
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="ABC123"
              />
            </label>
            <div className="pt-6">
              <button 
                type="submit" 
                disabled={loading || codigo.length < 3}
                className="w-full bg-[#E07A5F] text-white py-3 px-6 rounded-full font-bold shadow-lg hover:bg-[#c96a50] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Verificando...' : 'Verificar Código'}</span>
                {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="space-y-4 mt-2" onSubmit={handleRegistro}>
            <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm font-bold border border-green-200 flex items-center justify-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4" /> Código validado
            </div>

            <label className="contact-field block">
              <span className="contact-label text-[#2D7A3E]">Nombre(s):*</span>
              <input className="contact-input w-full mt-1 border-white" type="text" name="nombre" required value={formData.nombre} onChange={handleChange} />
            </label>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="contact-field block">
                <span className="contact-label text-[#2D7A3E]">Apellido Paterno:*</span>
                <input className="contact-input w-full mt-1 border-white" type="text" name="apellido_paterno" required value={formData.apellido_paterno} onChange={handleChange} />
              </label>
              <label className="contact-field block">
                <span className="contact-label text-[#2D7A3E]">Apellido Materno:*</span>
                <input className="contact-input w-full mt-1 border-white" type="text" name="apellido_materno" required value={formData.apellido_materno} onChange={handleChange} />
              </label>
            </div>

            <label className="contact-field block">
              <span className="contact-label text-[#2D7A3E]">Teléfono:*</span>
              <input className="contact-input w-full mt-1 border-white" type="tel" name="telefono" required value={formData.telefono} onChange={handleChange} />
            </label>

            <hr className="border-[#2D7A3E]/10 my-4" />

            <label className="contact-field block">
              <span className="contact-label text-[#2D7A3E]">Correo electrónico:*</span>
              <input className="contact-input w-full mt-1 border-white" type="email" name="correo" required value={formData.correo} onChange={handleChange} />
            </label>

            <label className="contact-field block">
              <span className="contact-label text-[#2D7A3E]">Contraseña:*</span>
              <div className="relative">
                <input
                  className="contact-input w-full mt-1 border-white pr-11"
                  type={mostrarPassword ? 'text' : 'password'}
                  name="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
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

            <label className="flex items-start gap-3 pt-2 text-sm text-[#4A2E18]/80">
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(e) => setAceptaTerminos(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#2D7A3E]"
              />
              <span>
                He leído y acepto los{' '}
                <Link to="/terminos-condiciones" target="_blank" className="font-bold text-[#2D7A3E] hover:underline">Términos y Condiciones</Link>
                {' '}y el{' '}
                <Link to="/aviso-privacidad" target="_blank" className="font-bold text-[#2D7A3E] hover:underline">Aviso de Privacidad</Link>.
              </span>
            </label>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || !aceptaTerminos}
                className="w-full bg-[#2D7A3E] text-white py-3 px-6 rounded-full font-bold shadow-lg hover:bg-[#235E30] transition-colors disabled:opacity-70"
              >
                <span>{loading ? 'Registrando...' : 'Completar Registro'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-8 text-center space-y-3">
        <p className="text-sm font-medium text-[#4A2E18]/70">
          ¿No sabes cómo registrarte?{' '}
          <Link to="/manuales" className="text-[#2D7A3E] font-bold hover:underline">
            Consulta el manual
          </Link>
        </p>
        <p className="text-sm font-medium text-[#4A2E18]/70">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="text-[#2D7A3E] font-bold hover:underline">
            Inicia sesión aquí
          </Link>
        </p>
        <Link to="/" className="block text-sm font-medium text-[#4A2E18]/70 hover:text-[#4A2E18]">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
};