import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

interface Enlace {
  label: string;
  href: string;
  detalle?: string;
}

interface Seccion {
  label: string;
  href?: string; // enlace directo (sin submenú)
  items?: Enlace[];
}

const secciones: Seccion[] = [
  { label: 'Inicio', href: '/' },
  {
    label: 'Festival',
    items: [
      { label: 'Cartelera', href: '/cartelera', detalle: 'Programa, horarios y sedes' },
      { label: 'Talleres', href: '/talleres', detalle: 'Talleres con registro en línea' },
      { label: 'Calendario', href: '/calendario', detalle: 'Actividades durante todo el año' },
      { label: 'Equipo', href: '/equipo', detalle: 'Quiénes hacemos el festival' },
    ],
  },
  {
    label: 'Eco Guardianes',
    items: [
      { label: 'El proyecto', href: '/ecoguardianes', detalle: 'Composta comunitaria' },
      { label: 'Manuales', href: '/manuales', detalle: 'Guías para composteros' },
      { label: 'Nosotros y contacto', href: '/info', detalle: 'Preguntas frecuentes y ubicación' },
    ],
  },
];

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  // Submenú abierto en escritorio (por etiqueta)
  const [desplegado, setDesplegado] = useState<string | null>(null);
  // Secciones abiertas en el menú de celular
  const [seccionesMovil, setSeccionesMovil] = useState<Record<string, boolean>>({});
  const navRef = useRef<HTMLElement>(null);
  const location = useLocation();

  const isItemActive = (href: string) => location.pathname === href.split('#')[0];
  const seccionActiva = (seccion: Seccion) =>
    seccion.href ? isItemActive(seccion.href) : !!seccion.items?.some((item) => isItemActive(item.href));

  // Cierra el submenú al hacer clic fuera o presionar Escape
  useEffect(() => {
    if (!desplegado) return;
    const alClic = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setDesplegado(null);
    };
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDesplegado(null);
    };
    document.addEventListener('mousedown', alClic);
    document.addEventListener('keydown', alTecla);
    return () => {
      document.removeEventListener('mousedown', alClic);
      document.removeEventListener('keydown', alTecla);
    };
  }, [desplegado]);

  const cerrarTodo = () => {
    setDesplegado(null);
    setIsOpen(false);
  };

  // En celular, la sección de la página actual empieza abierta
  const seccionMovilAbierta = (seccion: Seccion) => seccionesMovil[seccion.label] ?? seccionActiva(seccion);

  return (
    <header className="header-container">
      <div className="header-inner">
        <Link to="/" className="header-brand" aria-label="Ir al inicio" onClick={cerrarTodo}>
          <img src="/logo_fdma.svg" alt="" className="brand-logo" />
          <span className="brand-text">
            <span className="brand-name">FDMA</span>
            <span className="brand-sub">Festival del Medio Ambiente</span>
          </span>
        </Link>

        <nav ref={navRef} className="header-nav" aria-label="Navegación principal">
          {secciones.map((seccion) => {
            const activa = seccionActiva(seccion);

            if (seccion.href) {
              return (
                <Link key={seccion.label} to={seccion.href} className={`nav-link ${activa ? 'nav-link--active' : ''}`} onClick={cerrarTodo}>
                  {seccion.label}
                </Link>
              );
            }

            const abierto = desplegado === seccion.label;
            const idMenu = `submenu-${seccion.label.replace(/\s+/g, '-').toLowerCase()}`;
            return (
              <div
                key={seccion.label}
                className="nav-dropdown"
                onMouseEnter={() => setDesplegado(seccion.label)}
                onMouseLeave={() => setDesplegado(null)}
              >
                <button
                  type="button"
                  className={`nav-link nav-link--toggle ${activa ? 'nav-link--active' : ''}`}
                  aria-expanded={abierto}
                  aria-controls={idMenu}
                  onClick={() => setDesplegado(abierto ? null : seccion.label)}
                >
                  {seccion.label}
                  <ChevronDown className={`nav-chevron ${abierto ? 'nav-chevron--open' : ''}`} aria-hidden="true" />
                </button>

                {abierto && (
                  <div id={idMenu} className="nav-dropdown-panel">
                    {seccion.items?.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={`nav-dropdown-link ${isItemActive(item.href) ? 'nav-dropdown-link--active' : ''}`}
                        onClick={cerrarTodo}
                      >
                        <span className="nav-dropdown-title">{item.label}</span>
                        {item.detalle && <span className="nav-dropdown-detail">{item.detalle}</span>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
            {secciones.map((seccion) => {
              if (seccion.href) {
                return (
                  <Link
                    key={seccion.label}
                    to={seccion.href}
                    className={`mobile-nav-link ${isItemActive(seccion.href) ? 'mobile-nav-link--active' : ''}`}
                    onClick={cerrarTodo}
                  >
                    {seccion.label}
                  </Link>
                );
              }

              const abierta = seccionMovilAbierta(seccion);
              return (
                <div key={seccion.label} className="mobile-nav-group">
                  <button
                    type="button"
                    className={`mobile-nav-link mobile-nav-toggle ${seccionActiva(seccion) ? 'mobile-nav-link--active' : ''}`}
                    aria-expanded={abierta}
                    onClick={() => setSeccionesMovil((actual) => ({ ...actual, [seccion.label]: !abierta }))}
                  >
                    {seccion.label}
                    <ChevronDown className={`nav-chevron ${abierta ? 'nav-chevron--open' : ''}`} aria-hidden="true" />
                  </button>
                  {abierta && (
                    <div className="mobile-nav-sublist">
                      {seccion.items?.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={`mobile-nav-sublink ${isItemActive(item.href) ? 'mobile-nav-sublink--active' : ''}`}
                          onClick={cerrarTodo}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <Link
              to="/login"
              className="mobile-nav-link mobile-nav-link--action"
              onClick={cerrarTodo}
            >
              Iniciar sesión
            </Link>

            <Link
              to="/registro"
              className="mobile-nav-link mobile-nav-link--action mobile-nav-link--primary"
              onClick={cerrarTodo}
            >
              Registro
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};
