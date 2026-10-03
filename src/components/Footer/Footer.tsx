import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

import './Footer.css';

interface Aliado {
  id: string;
  nombre: string;
  enlace_url: string;
}

const INSTAGRAM_FDMA = 'https://www.instagram.com/fdma.mx';
const FACEBOOK_COMUNIDAD = 'https://www.facebook.com/share/1DKWiUtHvb/?mibextid=wwXIfr';

const enlacesExplora = [
  { to: '/cartelera', texto: 'Cartelera' },
  { to: '/talleres', texto: 'Talleres' },
  { to: '/calendario', texto: 'Calendario' },
  { to: '/ecoguardianes', texto: 'Eco Guardianes' },
  { to: '/manuales', texto: 'Manuales' },
];

const enlacesAyuda = [
  { to: '/info', texto: 'Nosotros & Contacto' },
  { to: '/info#guia-compostaje', texto: 'Guías de compostaje' },
  { to: '/info#preguntas-frecuentes', texto: 'Preguntas frecuentes' },
];

const IconoInstagram = () => (
  <svg className="footer-social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const IconoFacebook = () => (
  <svg className="footer-social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export const Footer = () => {
  // Los aliados se administran en /admin/aliados
  const [aliados, setAliados] = useState<Aliado[]>([]);

  useEffect(() => {
    supabase
      .from('aliados')
      .select('id, nombre, enlace_url')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .then(({ data }) => setAliados((data || []) as Aliado[]));
  }, []);

  return (
    <footer className="footer-wrapper">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-brand-row">
            <Link to="/" aria-label="Ir al inicio" className="footer-brand-link">
              <img src="/logo_fdma.svg" alt="" className="footer-brand-logo" />
              <span className="footer-brand-name">FDMA<small>Festival del Medio Ambiente</small></span>
            </Link>
          </div>
          <p className="footer-brand-copy">
            Un espacio dedicado a la educación y la acción ambiental. Hogar del proyecto de composta comunitaria Eco Guardianes.
          </p>
          <div className="footer-social">
            <a href={INSTAGRAM_FDMA} target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label="Instagram de FDMA">
              <IconoInstagram />
            </a>
            <a href={FACEBOOK_COMUNIDAD} target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label="Comunidad en Facebook de Parque Casa Blanca 3">
              <IconoFacebook />
            </a>
          </div>
        </div>

        <div className="footer-section">
          <h4 className="footer-title">Explora</h4>
          <ul className="footer-link-list">
            {enlacesExplora.map(({ to, texto }) => (
              <li key={to}><Link to={to} className="footer-link">{texto}</Link></li>
            ))}
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-title">Ayuda</h4>
          <ul className="footer-link-list">
            {enlacesAyuda.map(({ to, texto }) => (
              <li key={to}><Link to={to} className="footer-link">{texto}</Link></li>
            ))}
          </ul>
        </div>

        {aliados.length > 0 && (
          <div className="footer-section">
            <h4 className="footer-title">Aliados</h4>
            <ul className="footer-aliados">
              {aliados.map((aliado) => (
                <li key={aliado.id}>
                  <a href={aliado.enlace_url} target="_blank" rel="noopener noreferrer" className="footer-aliado">
                    {aliado.nombre}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="footer-bottom">
        <p className="footer-legal">
          <span>© 2026 FDMA</span>
          <span aria-hidden="true">·</span>
          <Link to="/aviso-privacidad" className="footer-legal-link">Aviso de privacidad</Link>
          <span aria-hidden="true">·</span>
          <Link to="/terminos-condiciones" className="footer-legal-link">Términos y condiciones</Link>
        </p>
        <p>
          Hecho con amor por{' '}
          <a href="https://instagram.com/ijessiyou" target="_blank" rel="noopener noreferrer" className="footer-legal-link font-bold">
            @ijessiyou
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
