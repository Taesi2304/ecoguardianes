import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { Login } from './Login';
import { Registro } from './Registro';

type ModoAcceso = 'login' | 'registro';

export default function Acceso() {
  const [parametros, setParametros] = useSearchParams();
  const modoInicial = parametros.get('modo') === 'registro' ? 'registro' : 'login';
  const [modo, setModo] = useState<ModoAcceso>(modoInicial);

  function cambiarModo(nuevoModo: ModoAcceso) {
    setModo(nuevoModo);
    setParametros({ modo: nuevoModo });
  }

  return (
    <div className="landing-page min-h-screen px-4 pb-12 pt-8 sm:pt-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 w-fit rounded-xl border border-[#4A2E18]/10 bg-[#FFF8DF] p-3 shadow-sm">
            <img src="/logo.svg" alt="Eco Guardianes" className="h-8 w-8 object-contain" />
          </div>
          <h1 className="section-title text-4xl">Acceso a Eco Guardianes</h1>
          <p className="mt-2 font-medium text-[#4A2E18]/70">Elige cómo quieres continuar.</p>
        </div>

        <div className="mx-auto mb-4 flex max-w-md rounded-full border border-[#2D7A3E]/20 bg-white/70 p-1.5 shadow-sm" role="tablist" aria-label="Tipo de acceso">
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'login'}
            onClick={() => cambiarModo('login')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-bold transition ${modo === 'login' ? 'bg-[#2D7A3E] text-white shadow-md' : 'text-[#2D7A3E] hover:bg-[#EBF3E8]'}`}
          >
            <LogIn className="h-4 w-4" /> Iniciar sesión
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'registro'}
            onClick={() => cambiarModo('registro')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-bold transition ${modo === 'registro' ? 'bg-[#2D7A3E] text-white shadow-md' : 'text-[#2D7A3E] hover:bg-[#EBF3E8]'}`}
          >
            <UserPlus className="h-4 w-4" /> Crear cuenta
          </button>
        </div>

        {modo === 'login' ? <Login /> : <Registro />}

        <p className="mt-2 text-center text-sm font-medium text-[#4A2E18]/70">
          <Link to="/manuales" className="font-bold text-[#2D7A3E] hover:underline">¿Necesitas ayuda? Consulta el manual</Link>
        </p>
      </div>
    </div>
  );
}
