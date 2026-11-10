import React from 'react';

const partners = [
  {
    name: 'eco_marce_shop',
    handle: '@eco_marce_shop',
    url: 'https://instagram.com/eco_marce_shop',
    avatar: '/aliados/eco_marce_shop.jpg', 
  },
  {
    name: 'fdma.mx',
    handle: '@fdma.mx',
    url: 'https://www.instagram.com/fdma.mx',
    avatar: '/logo_fdma.svg',
  },
  {
    name: 'puratastudio',
    handle: '@puratastudio',
    url: 'https://www.instagram.com/puratastudio',
    avatar: '/aliados/puratastudio.jpg',
  },
  {
    name: 'vivero_monos_garden',
    handle: '@vivero_monos_garden',
    url: 'https://www.instagram.com/vivero_monos_garden',
    avatar: '/aliados/vivero_monos_garden.jpg',
  },
  {
    name: 'pomodoro_agroecologico',
    handle: '@pomodoro_agroecologico',
    url: 'https://www.instagram.com/pomodoro_agroecologico',
    avatar: '/aliados/pomodoro.jpg',
  },
  {
    name: '_ware_street',
    handle: '@_ware_street',
    url: 'https://www.instagram.com/_ware_street',
    avatar: '/aliados/ware_street.jpg',
  },
  {
    name: 'edgara.castillo',
    handle: '@edgara.castillo',
    url: 'https://www.instagram.com/edgara.castillo',
    avatar: '/aliados/edgara_castillo.jpg',
  },
  {
    name: 'parquecasablanca3',
    handle: '@parquecasablanca3',
    url: 'https://www.facebook.com/share/1DKWiUtHvb/?mibextid=wwXIfr',
    avatar: '/aliados/parquecasablanca.jpg',
  }
];

export const LandingFDMA = () => {
  return (
    <div className="min-h-screen bg-[#fcfaf2] font-sans text-[#4a3728]">
      
      {/* SECCIÓN HERO */}
      <section className="w-full max-w-5xl mx-auto pt-16 pb-12 px-6 flex flex-col items-center text-center">
        
        {/* Logotipo oficial */}
        <img 
          src="/logo_fdma.svg" 
          alt="Logo Festival del Medio Ambiente" 
          className="w-32 h-32 object-contain mix-blend-multiply mb-4"
        />

        <h1 className="text-4xl md:text-6xl font-extrabold text-[#2d6a4f] mb-6 tracking-tight">
          Festival del Medio Ambiente
        </h1>
        
        {/* Bloque descriptivo informativo */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-[#4a3728]/10 mb-8 max-w-3xl text-center">
          <p className="text-gray-700 text-base md:text-lg leading-relaxed mb-4">
            <strong>¿Qué es el FDMA Matamoros?</strong> Es una iniciativa ciudadana dedicada a promover la sustentabilidad, la educación ambiental y la acción comunitaria en nuestra región.
          </p>
          <p className="text-gray-700 text-base md:text-lg leading-relaxed">
            Buscamos transformar la forma en que interactuamos con la naturaleza a través de talleres prácticos, redes de compostaje colectivo y la colaboración activa de nuestra comunidad.
          </p>
        </div>

        {/* Botones de Acción y Enlaces Sociales */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-6">
          <a href="/info" className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white text-[#4a3728] font-bold border border-[#4a3728]/20 hover:bg-gray-50 transition-all text-center shadow-sm">
            Conoce el Compostero
          </a>
          <a href="/acceso?modo=registro" className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#2d6a4f] text-white font-bold hover:bg-[#1b4332] transition-all text-center shadow-md">
            Crear Cuenta en Eco Guardianes
          </a>
        </div>

        {/* Redes sociales con imágenes locales de public */}
        <div className="flex items-center gap-3">
          <a 
            href="https://www.facebook.com/profile.php?id=100091930835447" 
            target="_blank" 
            rel="noreferrer" 
            aria-label="Facebook de FDMA"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#4a3728]/10 bg-white p-2.5 shadow-sm transition hover:scale-105"
          >
            <img src="/fb-icon.svg" alt="Facebook" className="w-full h-full object-contain" />
          </a>
          <a 
            href="https://instagram.com/fdma.mx" 
            target="_blank" 
            rel="noreferrer" 
            aria-label="Instagram de FDMA"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#4a3728]/10 bg-white p-2.5 shadow-sm transition hover:scale-105"
          >
            <img src="/ig-icon.svg" alt="Instagram" className="w-full h-full object-contain" />
          </a>
        </div>

      </section>

      {/* SECCIÓN INICIATIVAS */}
      <section className="w-full max-w-6xl mx-auto px-6 py-10">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 text-[#4a3728]">Nuestras Iniciativas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#4a3728]/10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-[#2d6a4f]/10 rounded-full flex items-center justify-center mb-4 p-3">
              <img src="/compostaje.svg" alt="Compostaje" className="w-full h-full object-contain" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-[#4a3728]">Compostaje Colectivo</h3>
            <p className="text-gray-600 text-sm">Gestionamos residuos orgánicos transformando el desperdicio en tierra fértil para la comunidad.</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#4a3728]/10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-[#2d6a4f]/10 rounded-full flex items-center justify-center mb-4 p-3">
              <img src="/educacion.svg" alt="Educación Ambiental" className="w-full h-full object-contain" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-[#4a3728]">Educación Ambiental</h3>
            <p className="text-gray-600 text-sm">Talleres y actividades didácticas para crear conciencia sobre el cuidado ecológico local.</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#4a3728]/10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-[#2d6a4f]/10 rounded-full flex items-center justify-center mb-4 p-3">
              <img src="/comunidad.svg" alt="Red de Comunidad" className="w-full h-full object-contain" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-[#4a3728]">Red de Comunidad</h3>
            <p className="text-gray-600 text-sm">Conectamos a vecinos, voluntarios y expertos para compartir ideas y proyectos sustentables.</p>
          </div>

        </div>
      </section>

      {/* SECCIÓN ALIADOS Y COMUNIDAD (Auto-carrusel tipo Marquee idéntico a Eco Guardianes) */}
      <section className="w-full bg-[#2d6a4f] py-12 overflow-hidden">
        <div className="text-center mb-8 px-6">
          <p className="text-white/70 text-xs font-bold tracking-[0.2em] uppercase mb-1">Nosotros</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">Aliados y comunidad</h2>
        </div>

        <div className="partner-marquee overflow-hidden w-full relative">
          <div className="partner-track flex gap-4 w-max animate-[marquee_25s_linear_infinite]">
            {[...partners, ...partners].map((partner, idx) => (
              <a
                key={`${partner.name}-${idx}`}
                href={partner.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-white transition hover:bg-white/20 backdrop-blur-sm"
              >
                <img src={partner.avatar} alt={partner.name} className="h-7 w-7 rounded-full object-cover bg-white" />
                <span className="font-semibold text-sm">{partner.handle}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN COMUNIDAD EN ACCIÓN (Widget de Common Ninja) */}
      <section className="w-full max-w-6xl mx-auto px-6 py-16">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-[#4a3728]">Comunidad en Acción</h2>
          <a href="https://instagram.com/fdma.mx" target="_blank" rel="noreferrer" className="text-[#2d6a4f] font-bold hover:underline">
            Ver en Instagram &rarr;
          </a>
        </div>
        
        <div className="w-full bg-white border border-[#4a3728]/10 rounded-3xl overflow-hidden shadow-sm h-[600px] md:h-[800px]">
          <iframe 
            src="https://commoninja.site/2590fe35-7a18-435a-bf75-b45fd51c402f" 
            frameBorder="0" 
            className="w-full h-full"
            title="Instagram Feed FDMA"
            loading="lazy"
          ></iframe>
        </div>
      </section>

    </div>
  );
};

export default LandingFDMA;