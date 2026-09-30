import { useEffect, useState } from 'react';
import { UserCircleIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

import './Footer.css';

interface Aliado {
  id: string;
  nombre: string;
  enlace_url: string;
}

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
        </div>

        <div className="footer-section">
          <h4 className="footer-title">Navegación</h4>
          <ul className="footer-link-list">
            <li><Link to="/" className="footer-link">FDMA-Festival</Link></li>
            <li><Link to="/cartelera" className="footer-link">Cartelera</Link></li>
            <li><Link to="/talleres" className="footer-link">Talleres</Link></li>
            <li><Link to="/calendario" className="footer-link">Calendario</Link></li>
            <li><Link to="/ecoguardianes" className="footer-link">Eco Guardianes</Link></li>
            <li><Link to="/info" className="footer-link">Nosotros & Contacto</Link></li>
            <li><Link to="/login" className="footer-link">Inicio de sesión</Link></li>
            <li><Link to="/registro" className="footer-link">Registro</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-title">Recursos</h4>
          <ul className="footer-link-list">
            <li><a href="/manuales" className="footer-link">Manuales</a></li>
            <li><a href="/info#recursos" className="footer-link">Guías de compostaje</a></li>
            <li><a href="/info#recursos" className="footer-link">Preguntas frecuentes</a></li>
            <li><a href="/info#sobre-nosotros" className="footer-link">Sobre nosotros</a></li>
            <li><Link to="/aviso-privacidad" className="footer-link">Aviso de Privacidad</Link></li>
            <li><Link to="/terminos-condiciones" className="footer-link">Términos y Condiciones</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-title">Aliados</h4>

          {aliados.map((aliado) => (
            <div key={aliado.id} className="footer-contact-item">
              <UserCircleIcon className="footer-contact-icon text-pink-500" />
              <a
                href={aliado.enlace_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline hover:text-green-500 transition-colors"
              >
                {aliado.nombre}
              </a>
            </div>
          ))}

          <div className="footer-contact-item">
            <svg
              className="footer-contact-icon text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
            <a
              href="https://www.facebook.com/share/1DKWiUtHvb/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline hover:text-blue-500 transition-colors"
            >
              Comunidad en FB de Parque Casa Blanca 3
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom text-center">
        <p>© 2026 FDMA · Festival del Medio Ambiente. Todos los derechos reservados.</p>
        <p>
          Hecho con amor. Desarrollado por{' '}
          <a
            href="https://instagram.com/ijessiyou"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold hover:text-green-500 hover:underline transition-colors"
          >
            @ijessiyou
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
