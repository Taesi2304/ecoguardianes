import { Link } from 'react-router-dom';
import './Landing.css';
import planta1 from '../../stickers/planta-1.svg';
import comunidad1 from '../../stickers/comunidad-1.svg';
import mundo1 from '../../stickers/mundo-1.svg';
import compostero1 from '../../stickers/compostero-1.svg';
import manzanaComida from '../../stickers/manzana-comida.svg';
import maceta from '../../stickers/maceta.svg';
import gusano from '../../stickers/gusano-2.svg'; 

const whyCards = [
  {
    title: 'Aprende',
    desc: 'Accede a guías, consejos y recursos para hacer composta de forma fácil.',
    icon: <img src={planta1} alt="Planta" className="why-icon-image" />,
  },
  {
    title: 'Comparte',
    desc: 'Conecta con tu comunidad y comparte tus avances e ideas.',
    icon: <img src={comunidad1} alt="Comunidad" className="why-icon-image" />,
  },
  {
    title: 'Cuida el planeta',
    desc: 'Menos residuos en vertederos, mas vida para la tierra y futuras generaciones.',
    icon: <img src={mundo1} alt="Mundo" className="why-icon-image" />,
  },
];

const compostCards = [
  {
    name: 'Valle de Casa Blanca III',
    participants: 'Eco Guardianes',
    description: 'Compostero comunitario familiar.',
  },
];

const testimonials = [
  {
    quote: '“Antes tirábamos toda la basura, ahora hacemos composta y nuestro jardín ha estado vivo.”',
    name: 'Ana García',
    role: 'Eco Guardiana',
    color: 'beige',
  },
  {
    quote: '“Me ha enseña do que pequeños cambios grandes transformaciones.”',
    name: 'Luis Martínez',
    role: 'Eco Guardián',
    color: 'green',
  },
  {
    quote: '“Juntos estamos construyendo un futuro más verde para nuestras familias.”',
    name: 'Mariana López',
    role: 'Eco Guardiana',
    color: 'beige',
  },
];

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
    avatar: '/aliados/fdma.jpg',
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

export const Landing = () => {
  return (
    <div className="landing-page">
      <section id="inicio" className="landing-hero">
        <div className="hero-copy">
          <h1 className="landing-title">
          Unidos para transformar <span className="hero-highlight">residuos en vida.</span> 
        </h1>
         <p className="hero-description">
             Monitoreando hoy el compostero que transforma el mañana.
        </p>

          <div className="hero-actions">
            <Link to="/login" className="hero-primary">
              <span>Únete a Eco Guardianes</span>
              <img src="/logo.svg" alt="" className="hero-primary-icon" />
            </Link>
            {/* <button className="hero-secondary">
              Conoce más
            </button> */}
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-poster">
            <img
              src="/compostero-colectivo.png"
              alt="Compostero Colectivo #1 — Casa Blanca"
              className="poster-image"
            />
            <span className="poster-caption">
              Compostero — Casa Blanca
            </span>
          </div>

          <div className="hero-note">
            Hecho por amor, tierra y comunidad. 
          </div>
        </div>
      </section>

      <section id="Ecoguardianes" className="section-block">
        <div className="section-header">
          <h2 className="section-title">¿Qué es Eco Guardianes?</h2>
          <div className="section-kicker">Somos una plataforma comunitaria</div>
        </div>

        <div className="why-grid">
          {whyCards.map((item, idx) => (
            <article key={idx} className="paper-card why-card">
              <div className="why-icon">
                {item.icon}
              </div>
              <h3 className="why-title">{item.title}</h3>
              <p className="why-desc">{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

    
      <section id="compostero" className="section-block">
        <div className="section-header section-header--compact">
          <h2 className="section-title">Composteros</h2>
          <span className="section-kicker">Compostero destacado</span>
        </div>

        <div className="compost-list">
          {compostCards.map((item, idx) => (
            <article key={idx} className="paper-card compost-card">
              <div className="compost-layout">
                <img src="/galeria/foto1.jpeg" alt={item.name} className="compost-image" />

                <div className="compost-content">
                  <div className="compost-meta">
                    <h3 className="compost-name">{item.name}</h3>
                  </div>

                  <p className="compost-description">{item.description}</p>

                  <div className="compost-extra">
                    <span>{item.participants}</span>
                    <span>•</span>
                    <span>Monitoreo en tiempo real</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="visitas" className="section-block section-block--narrow">
        <h2 className="section-title section-title--center mb-10">¿Cómo funciona?</h2>
        <div className="steps-grid">
          {[
            { step: '1', title: 'Registro', desc: 'Únete a la comunidad y crea tu espacio de compostaje.', icon: <img src={compostero1} alt="Registro" className="step-icon-image" /> },
            { step: '2', title: 'Agrega residuos', desc: 'Registra, observa y aprende sobre tu compuesta.', icon: <img src={manzanaComida} alt="Separa residuos" className="step-icon-image" /> },
            { step: '3', title: 'Monitoreo EcoGuardian', desc: 'Observa el proceso, aprende y comparte tus hallazgos.', icon: <img src={gusano} alt="Monitoreo" className="step-icon-image" /> },
            { step: '4', title: 'Compostaje natural', desc: 'Usa la composta y multiplica tu impacto positivo.', icon: <img src={maceta} alt="Compostaje" className="step-icon-image" /> },
          ].map((item, idx) => (
            <div key={idx} className="paper-card step-card">
              <div className="step-number">{item.step}</div>
              <div className="step-icon-wrapper">
                {item.icon}
              </div>
              <h3 className="step-title">{item.title}</h3>
              <p className="step-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="impacto" className="stats-band">
        <div className="impact-inner">
          <div className="impact-header">
            <p className="impact-kicker">Nosotros</p>
            <h2 className="impact-title"> Aliados y comunidad</h2>
          </div>

          <div className="partner-marquee">
            <div className="partner-track">
              {[...partners, ...partners].map((partner, idx) => (
                <a
                  key={`${partner.name}-${idx}`}
                  href={partner.url}
                  target="_blank"
                  rel="noreferrer"
                  className="partner-pill"
                >
                  <img src={partner.avatar} alt={partner.name} className="partner-avatar" />
                  <span className="partner-handle">{partner.handle}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* <section id="comunidad" className="section-block">
        <h2 className="section-title section-title--center">Historias que inspiran</h2>
        <br />

        <div className="testimonials-grid">
          {testimonials.map((item, idx) => (
            <article key={idx} className={`paper-card testimonial-card ${item.color === 'green' ? 'rotate-1' : '-rotate-1'}`}>
              <div className={`testimonial-tape ${item.color === 'green' ? 'washi-tape-green' : 'washi-tape-beige'}`} />
              <p className="testimonial-quote">{item.quote}</p>
              <div className="testimonial-footer">
                <div className="testimonial-avatar">{item.name[0]}</div>
                <div>
                  <h4 className="testimonial-name">{item.name}</h4>
                  <span className="testimonial-role">{item.role}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>   */}
  </div>
  );
};