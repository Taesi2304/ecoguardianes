import { ExternalLink } from 'lucide-react';
import '../Landing/Landing.css';
import hoja from '/hoja.svg';
import aviso from '/aviso.svg';
import registro from '/registro.svg';
import mapa from '/mapa.svg';

// Arreglo de imágenes para el banner
const galleryImages = [
  '/galeria/foto1.jpeg',
  '/galeria/foto2.jpeg',
  '/galeria/foto3.jpeg',
  '/galeria/foto4.jpeg',
  '/galeria/foto5.jpeg',
  '/galeria/foto6.jpeg',
  '/galeria/foto7.jpeg',
  '/galeria/foto8.jpeg',
  '/galeria/foto9.jpeg',
  '/galeria/foto10.jpeg',
  '/galeria/foto11.jpeg',
  '/galeria/foto12.jpeg',
  '/galeria/foto13.jpeg',
];

export const Informacion = () => {
  return (
    <div className="landing-page"> {/* 1. Quitamos el pt-20 */}
      
      {/* SECCIÓN: BANNER DE IMÁGENES (ESTILO MARQUEE) */}
      <section className="stats-band mb-12 mt-0"> {/* 2. Forzamos el mt-0 para pegarlo arriba */}

        <div className="impact-inner">
          <div className="impact-header">
            <p className="impact-kicker">Comunidad en acción</p>
            <h2 className="impact-title">Nuestros Composteros</h2>
          </div>

          <div className="partner-marquee">
            <div className="partner-track">
              {/* Duplicamos el arreglo para que el efecto infinito no se corte */}
              {[...galleryImages, ...galleryImages].map((imgSrc, idx) => (
                <div key={idx} className="flex-shrink-0 w-64 h-48 mx-4 transform hover:scale-105 transition-transform duration-300">
                  <img 
                    src={imgSrc} 
                    alt={`Galería Eco Guardianes ${idx}`} 
                    className="w-full h-full object-cover rounded-2xl border-4 border-[#FFF8DF]/30 shadow-lg"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      
      {/* SECCIÓN: SOBRE NOSOTROS */}
      <section id="sobre-nosotros" className="section-block">
        <div className="section-header section-header--compact">
          <h1 className="section-title">Sobre Nosotros</h1>
          <span className="section-kicker">El corazón del proyecto</span>
        </div>
        <div className="paper-card about-card">
          <p className="about-copy text-lg font-medium text-[#4A2E18]">
            Una 
            <span className="font-bold"> idea que nació del diálogo  </span>
            y se hizo posible gracias al trabajo colectivo. 
            El objetivo es crear una propuesta 
            <span className="font-bold"> autosostenible </span>
            que nos permita seguir
             <span className="font-bold"> regenerando el suelo de Matamoros </span>
             transformando nuestros residuos orgánicos en vida y fortaleciendo los vínculos de nuestra comunidad.
          </p>
        </div>
      </section>

     <section id="recursos" className="section-block">
        <div className="section-header section-header--compact">
          <h2 className="section-title">Recursos</h2>
          <span className="section-kicker">Aprende con nosotros</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card de Guías */}
          <article className="paper-card why-card">
            <div className="testimonial-tape washi-tape-beige" />
            <div className="why-icon">
              <img src={hoja} alt="Hoja" className="w-8 h-8 object-contain" />
            </div>
            <h3 className="why-title">Guía de Compostaje</h3>
            <br />
            <p className="why-desc mb-4">Descubre qué materiales sí puedes llevar al compostero y cuáles debes evitar.</p>
            <br />
            <a
              href="https://drive.google.com/file/d/1Nrcwt85StGxXp2GF69hW86qSrR7jKdz_/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="hero-secondary inline-flex items-center gap-2 text-sm px-4 py-2"
            >
              <span>Ver PDF</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </article>

          {/* Card de FAQ con efecto Washi Tape */}
          <article className="paper-card why-card relative mt-4 md:mt-0">
            {/* Aquí está el efecto visual de la cinta adhesiva */}
            <div className="testimonial-tape washi-tape-green" />
            
            <div className="why-icon mt-2">
              <img src={aviso} alt="Pregunta" className="w-8 h-8 object-contain" />
            </div>
            <h3 className="why-title">Preguntas Frecuentes</h3>
            <div className="text-left mt-4 space-y-3">
              {/* <details className="cursor-pointer group">
                <summary className="font-bold text-[#4A2E18] list-none flex justify-between items-center">
                  ¿Tiene mal olor la composta? <span className="text-[#2D7A3E] text-xl">+</span>
                </summary>
                <p className="text-sm mt-2 text-[#4A2E18]/70">Si se hace correctamente manteniendo el equilibrio entre elementos secos y húmedos, huele a tierra mojada, no a basura.</p>
              </details> */}
              <details className="cursor-pointer group">
                <summary className="font-bold text-[#4A2E18] list-none flex justify-between items-center">
                  ¿Qué es una composta? <span className="text-[#2D7A3E] text-xl">+</span>
                </summary>
                <p className="text-sm mt-2 text-[#4A2E18]/70">Es un
                  <span className="font-bold"> abono orgánico </span> obtenido de la
                   <span className="font-bold">  descomposición natural
                     de residuos vegetales </span>
                  y animales, ideal para enriquecer la tierra de cultivo.</p>
              </details>
              <hr className="border-[#4A2E18]/10" />

              <details className="cursor-pointer group">
                <summary className="font-bold text-[#4A2E18] list-none flex justify-between items-center">
                  ¿Qué es un compostero? <span className="text-[#2D7A3E] text-xl">+</span>
                </summary>
                <p className="text-sm mt-2 text-[#4A2E18]/70">
                 Es el 
                  <span className="font-bold"> contendor o espacio </span> 
                 diseñado específicamente para contener, 
                 <span className="font-bold"> organizar y acelerar el proceso de transformación de los residuos orgánicos
                  </span> en composta.</p>
              </details>

              <hr className="border-[#4A2E18]/10" />
              <details className="cursor-pointer group">
                <summary className="font-bold text-[#4A2E18] list-none flex justify-between items-center">
                  ¿Cómo me registro como voluntario? <span className="text-[#2D7A3E] text-xl">+</span>
                </summary>
                <p className="text-sm mt-2 text-[#4A2E18]/70"> Contactanos por
                 <span className="font-bold"> Instagram </span> 
                 para darte tu código de acceso o contesta 
                 <span className="font-bold"> la encuesta de voluntariado </span> 
                  que esta en la seccion de abajo. 
                  <br />
                  <span className="font-bold"> "¡Vuélvete Eco Guardian!".</span>
                  </p>
              </details>
            </div>
          </article>
        </div>
      </section>

      {/* SECCIÓN: CONTACTO / UBICACIÓN */}
      <section id="contacto" className="section-block">
        <div className="section-header section-header--compact">
          <h2 className="section-title">Contacto y Ubicación</h2>
          <span className="section-kicker">Únete al movimiento</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* COLUMNA IZQUIERDA: MAPA */}
          <article className="paper-card why-card p-5 flex flex-col">
            <h3 className="font-bold text-[#4A2E18] mb-4 flex items-center justify-center gap-2">
              <img src={mapa} alt="Mapa" className="w-6 h-6 object-contain" />
              Compostero 1° - Valle de Casa Blanca III
            </h3>
            
            {/* Contenedor del mapa */}
            <div className="w-full h-64 md:h-full min-h-[250px] rounded-xl overflow-hidden border-2 border-[#4A2E18]/10 relative shadow-inner">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d897.5358713316259!2d-97.54525414368598!3d25.86475453073144!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x866f930045d93bab%3A0xe4e34c708ce72f18!2sParque%20Lineal%20de%20Casablanca!5e0!3m2!1ses!2smx!4v1785535555316!5m2!1ses!2smx"
                width="100%"
                height="100%"
                style={{ border: 0, position: 'absolute', top: 0, left: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                title="Ubicación Compostero Casa Blanca"
              ></iframe>
            </div>
          </article>

          {/* COLUMNA DERECHA: TARJETA DE ENCUESTA */}
          <article className="paper-card contact-card flex flex-col justify-center items-center text-center p-8">
            <div className="why-icon mb-4">
              <img src={registro} alt="Encuesta" className="w-8 h-8 object-contain" />
            </div>
            <h3 className="why-title mb-4">¡Vuélvete Eco Guardian!</h3>
            <p className="text-base text-[#4A2E18]/80 mb-8 leading-relaxed">
              ¿Te interesa implementar un compostero comunitario en tu colonia o ser parte de nuestra red actual? 
              Llena nuestra breve encuesta para tener acceso.
            </p>
            <br />
            
            <a 
              href="https://docs.google.com/forms/d/e/1FAIpQLScG-OcX0Qehprh5PRyD6ThKUM1nsP9vi-msq6x_IgW6XjvKqg/viewform?usp=preview" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hero-primary inline-flex items-center gap-2 hover:scale-105 transform transition-transform"
            >
              
              <span>Llenar Encuesta</span>
              <ExternalLink className="w-5 h-5" />
            </a>
          </article>

        </div>
      </section>
      
    </div>
  );
};