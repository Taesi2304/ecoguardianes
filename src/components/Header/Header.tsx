import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

const navItems = [
  { label: 'FDMA', href: '/' },
  { label: 'Cartelera', href: '/cartelera' },
  { label: 'Talleres', href: '/talleres' },
  { label: 'Calendario', href: '/calendario' },
  { label: 'Eco Guardianes', href: '/ecoguardianes' },
  { label: 'Contacto', href: '/info' },
];

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isItemActive = (href: string) => {
    const path = href.split('#')[0];
    return location.pathname === path;
  };

  return (
    <header className="header-container">
      <div className="header-inner">
        <Link to="/" className="header-brand" aria-label="Ir al inicio">
          <img src="/logo-horizontal.svg" alt="Eco Guardianes" className="brand-logo" />
        </Link>

        <nav className="header-nav" aria-label="Navegación principal">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`nav-link ${isItemActive(item.href) ? 'nav-link--active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link to="/login" className="header-link-btn header-link-btn--ghost" aria-label="Iniciar sesión">
            Iniciar sesión
          </Link>

          <Link to="/registro" className="header-link-btn header-link-btn--primary" aria-label="Registrarse">
            Registro
          </Link>

          <button
            type="button"
            aria-label="Abrir menú"
            aria-expanded={isOpen}
            className="header-menu-button"
            onClick={() => setIsOpen((open) => !open)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mobile-nav-wrapper">
          <nav className="mobile-nav" aria-label="Navegación móvil">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`nav-link mobile-nav-link ${isItemActive(item.href) ? 'mobile-nav-link--active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            <Link
              to="/login"
              className="mobile-nav-link mobile-nav-link--action"
              onClick={() => setIsOpen(false)}
            >
              Iniciar sesión
            </Link>

            <Link
              to="/registro"
              className="mobile-nav-link mobile-nav-link--action mobile-nav-link--primary"
              onClick={() => setIsOpen(false)}
            >
              Registro
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};