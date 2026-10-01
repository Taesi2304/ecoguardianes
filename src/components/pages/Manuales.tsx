import { BookOpen, CheckCircle2, ChevronDown, ClipboardCheck, History, HelpCircle, Leaf, LogIn, UserPlus ,PlayCircle} from 'lucide-react';

const pasosCuenta = [
  'En la pantalla de inicio, seleccione Registro.',
  'Escriba su nombre, correo electrónico y una contraseña.',
  'Seleccione su colonia e ingrese el código de acceso que le compartió el equipo Eco Guardianes.',
  'Presione "Crear cuenta". Después podrá iniciar sesión con su correo y contraseña.',
];

const pasosVisita = [
  'Inicie sesión y entre a "Registrar Visita".',
  'Elija el compostero que visitó. Si su colonia tiene uno solo, ya aparece seleccionado.',
  'Escriba cuánto aportó, elija si fue en kilos o en litros y toque los tipos de residuos que agregó.',
  'Revise la composta y toque la opción que mejor describa su temperatura, su humedad y su olor.',
  'Marque los animalitos u hongos que vio. Si hay plagas o escurre líquido, márquelo en "¿Algún problema?".',
  'Lea la recomendación que aparece: le indica si el compostero va bien o qué conviene ajustar.',
  'Tome o adjunte al menos una fotografía (es obligatoria) y presione "Guardar bitácora".',
];

const pasosHistorial = [
  'Abra el menú y seleccione "Historial".',
  'En "Mis registros" verá sus visitas. En "Comunidad" verá las de todos los composteros de su colonia.',
  'Arriba encontrará cuántos kilos o litros ha aportado y cuándo fue su última visita.',
  'Las visitas están agrupadas por mes. Toque una fotografía para verla en grande.',
];

function ListaPasos({ pasos }: { pasos: string[] }) {
  return (
    <ol className="space-y-4">
      {pasos.map((paso, indice) => (
        <li key={paso} className="flex items-start gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2d6a4f] text-lg font-bold text-white">
            {indice + 1}
          </span>
          <span className="pt-1 text-lg leading-relaxed text-[#4a3728]">{paso}</span>
        </li>
      ))}
    </ol>
  );
}

export default function Manuales() {
  return (
    <div className="bg-[#fcfaf2] px-4 py-10 text-[#4a3728] sm:px-8 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#d8ece1] text-[#2d6a4f]">
            <BookOpen className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[#2d6a4f]">Guía Eco Guardianes</p>
          <h1 className="text-3xl font-extrabold leading-tight text-[#4a3728] sm:text-4xl md:text-5xl">Manuales de uso</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[#4a3728]/80">
            Haga clic <a href="https://drive.google.com/file/d/1psTbiKpZVNgJKX14Ld7SUFQeUoVyT7pw/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="font-bold text-[#2d6a4f] underline hover:no-underline">aquí</a> y encontrará un manual con instrucciones sencillas para usar la plataforma.
          </p>
        </header>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#4a3728]/10 sm:p-8" aria-labelledby="empezar">
          <div className="mb-6 flex items-center gap-4">
            <div className="rounded-xl bg-[#d8ece1] p-3 text-[#2d6a4f]"><UserPlus className="h-7 w-7" aria-hidden="true" /></div>
            <div><p className="text-sm font-bold uppercase tracking-wide text-[#2d6a4f]">Primer paso</p><h2 id="empezar" className="text-2xl font-bold">Crear una cuenta</h2></div>
          </div>
          <ListaPasos pasos={pasosCuenta} />
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="/registro" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#2d6a4f] px-5 py-3 text-base font-bold text-white transition hover:bg-[#1b4332]">
              <UserPlus className="h-5 w-5" aria-hidden="true" /> Ir a "Registro"
            </a>
            <a href="https://drive.google.com/file/d/1TKK49tpYLj9iqS6P9gorY7YvCoKO3eMp/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-[#2d6a4f] px-5 py-3 text-base font-bold text-[#2d6a4f] transition hover:bg-[#d8ece1]">
              <PlayCircle className="h-5 w-5" aria-hidden="true" /> Ver tutorial paso a paso
            </a>
          </div>
        </section>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#4a3728]/10 sm:p-8" aria-labelledby="iniciar">
          <div className="mb-6 flex items-center gap-4">
            <div className="rounded-xl bg-[#f4e8bf] p-3 text-[#4a3728]"><LogIn className="h-7 w-7" aria-hidden="true" /></div>
            <div><p className="text-sm font-bold uppercase tracking-wide text-[#2d6a4f]">Cada vez que visite la plataforma</p><h2 id="iniciar" className="text-2xl font-bold">Iniciar sesión</h2></div>
          </div>
          <p className="text-lg leading-relaxed">Seleccione "Iniciar sesión", escriba el correo y la contraseña que registró, y presione "Entrar".</p>
          
           <div className="mt-7 flex flex-wrap gap-3">
            <a href="/login" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#2d6a4f] px-5 py-3 text-base font-bold text-white transition hover:bg-[#1b4332]">
              <LogIn className="h-5 w-5" aria-hidden="true" /> Ir a "Inicio de sesión"
            </a>
          </div>

        </section>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#4a3728]/10 sm:p-8" aria-labelledby="visita">
  {/* 1. Encabezado */}
  <div className="mb-6 flex items-center gap-4">
    <div className="rounded-xl bg-[#d8ece1] p-3 text-[#2d6a4f]">
      <ClipboardCheck className="h-7 w-7" aria-hidden="true" />
    </div>
    <div>
      <p className="text-sm font-bold uppercase tracking-wide text-[#2d6a4f]">Actividad principal</p>
      <h2 id="visita" className="text-2xl font-bold text-gray-900">Registrar una visita o monitoreo</h2>
    </div>
  </div>

  {/* 2. Lista de Pasos */}
  <ListaPasos pasos={pasosVisita} />

  {/* 3. Contenedor inferior: Consejo y Botón separados */}
  <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
    {/* Botón de Tutorial */}
    <a 
      href="https://drive.google.com/file/d/1YyWqGmSYjZHJuYPzdwiHH1Pg5ew7-HmU/view?usp=sharing" 
      target="_blank" 
      rel="noopener noreferrer" 
      className="inline-flex shrink-0 min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#2d6a4f] px-6 py-3 text-base font-bold text-[#2d6a4f] transition hover:bg-[#d8ece1]"
    >
      <PlayCircle className="h-5 w-5" aria-hidden="true" /> 
      Ver tutorial
    </a>

    
    {/* Consejo (Alerta amarilla) */}
    <div className="flex flex-1 items-start gap-3 rounded-xl bg-[#fff8df] p-4 text-base leading-relaxed text-[#4a3728]">
      <Leaf className="mt-1 h-5 w-5 shrink-0 text-[#2d6a4f]" aria-hidden="true" />
      <p>
        <strong>Consejo:</strong> Registre la visita el mismo día para recordar mejor lo que observó. Si la recomendación aparece en rojo, avise al equipo de su colonia.
      </p>
    </div>
        
  </div>
</section>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#4a3728]/10 sm:p-8" aria-labelledby="historial">
          <div className="mb-6 flex items-center gap-4">
            <div className="rounded-xl bg-[#f4e8bf] p-3 text-[#4a3728]"><History className="h-7 w-7" aria-hidden="true" /></div>
            <div><p className="text-sm font-bold uppercase tracking-wide text-[#2d6a4f]">Consulte sus registros</p><h2 id="historial" className="text-2xl font-bold">Ver mi historial</h2></div>
          </div>
          <ListaPasos pasos={pasosHistorial} />
          <a href="https://drive.google.com/file/d/1YyWqGmSYjZHJuYPzdwiHH1Pg5ew7-HmU/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-[#2d6a4f] px-5 py-3 text-base font-bold text-[#2d6a4f] transition hover:bg-[#d8ece1]">
            <PlayCircle className="h-5 w-5" aria-hidden="true" /> Ver tutorial paso a paso
          </a>
        </section>

        <section className="rounded-2xl bg-[#2d6a4f] p-6 text-white shadow-sm sm:p-8" aria-labelledby="ayuda">
          <div className="mb-5 flex items-center gap-4">
            <HelpCircle className="h-8 w-8 shrink-0" aria-hidden="true" />
            <h2 id="ayuda" className="text-2xl font-bold text-white">¿Necesita ayuda?</h2>
          </div>
          <div className="space-y-1 text-lg leading-relaxed text-white/95">
            <p><strong>No recuerdo mi contraseña:</strong> contacte al equipo Eco Guardianes para recibir apoyo.</p>
            <p><strong>No tengo código de colonia:</strong> solicítelo a la persona responsable de su colonia.</p>
            <p><strong>La página no carga:</strong> revise su conexión a internet y vuelva a intentarlo.</p>
          </div>
        </section>

        <div className="mt-8 flex items-center justify-center gap-2 text-center text-base text-[#4a3728]/70">
          <CheckCircle2 className="h-5 w-5 text-[#2d6a4f]" aria-hidden="true" />
          <span>Gracias por ayudar a cuidar nuestra comunidad.</span>
        </div>
      </div>
    </div>
  );
}
