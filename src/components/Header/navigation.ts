export interface Enlace {
  label: string;
  href: string;
  detalle?: string;
}

export interface Seccion {
  label: string;
  href?: string;
  items?: Enlace[];
}

export const secciones: Seccion[] = [
  { label: 'Inicio', href: '/' },
  {
    label: 'Festival',
    items: [
      { label: 'Cartelera', href: '/cartelera', detalle: 'Programa, horarios y sedes' },
      { label: 'Talleres', href: '/talleres', detalle: 'Talleres con registro en línea' },
      { label: 'Calendario', href: '/calendario', detalle: 'Actividades durante todo el año' },
      { label: 'Directorio', href: '/directorio', detalle: 'Equipo organizador del festival' },
    ],
  },
  {
    label: 'Eco Guardianes',
    items: [
      { label: 'Composteros', href: '/ecoguardianes', detalle: 'Composta comunitaria' },
      { label: 'Manuales', href: '/manuales', detalle: 'Guías para composteros' },
      { label: 'Nosotros y contacto', href: '/info', detalle: 'Preguntas frecuentes y ubicación' },
    ],
  },
];
