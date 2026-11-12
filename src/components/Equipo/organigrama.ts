import html2canvas from 'html2canvas';
import domToImage from 'dom-to-image-more';
import type { Integrante } from './equipo';

export const ORGANIGRAMA_AREAS = [
  {
    id: 'talento',
    nombre: 'Coordinación de Talento y Expositores',
    color: 'bg-[#8b5cf6]',
    ring: 'ring-[#8b5cf6]',
    texto: 'text-[#6d28d9]',
    palabrasClave: ['talento', 'expositor', 'taller', 'conferencia', 'alianza'],
  },
  {
    id: 'logistica',
    nombre: 'Logística y Espacios',
    color: 'bg-[#21a6c7]',
    ring: 'ring-[#21a6c7]',
    texto: 'text-[#087f9d]',
    palabrasClave: ['logistica', 'logística', 'espacio', 'infraestructura', 'operativa', 'administracion', 'administración'],
  },
  {
    id: 'comunicacion',
    nombre: 'Comunicación y Marketing',
    color: 'bg-[#d58b3f]',
    ring: 'ring-[#d58b3f]',
    texto: 'text-[#a55b16]',
    palabrasClave: ['comunicacion', 'comunicación', 'marketing', 'redes', 'digital', 'difusion', 'difusión', 'diseño'],
  },
] as const;

export const AREA_GENERAL = {
  id: 'general',
  nombre: 'Coordinación General',
  color: 'bg-[#7bc35b]',
  ring: 'ring-[#7bc35b]',
  texto: 'text-[#2d6a4f]',
  palabrasClave: ['general'],
} as const;

export type AreaOrganigrama = typeof ORGANIGRAMA_AREAS[number] | typeof AREA_GENERAL;

function normalizarArea(area: string) {
  return area.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function agruparParaOrganigrama(integrantes: Integrante[]) {
  const general = integrantes.filter((integrante) => normalizarArea(integrante.area).includes('general'));
  const grupos = ORGANIGRAMA_AREAS.map((area) => ({
    ...area,
    miembros: integrantes.filter((integrante) => {
      const nombreArea = normalizarArea(integrante.area);
      return !nombreArea.includes('general') && area.palabrasClave.some((palabra) => nombreArea.includes(normalizarArea(palabra)));
    }),
  }));

  return { general, grupos };
}

function descargarDataUrl(dataUrl: string, nombreArchivo: string) {
  const enlace = document.createElement('a');
  enlace.download = nombreArchivo;
  enlace.href = dataUrl;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}

export async function exportarOrganigrama(elemento: HTMLElement, nombreArchivo = 'organigrama-fdma.png') {
  await document.fonts.ready;

  const ancho = elemento.scrollWidth;
  const alto = elemento.scrollHeight;
  const png = await domToImage.toPng(elemento, {
    bgcolor: '#f8f1e4',
    width: ancho,
    height: alto,
    scale: 2,
    pixelRatio: 1,
    cacheBust: true,
    preserveScroll: false,
    style: {
      width: `${ancho}px`,
      height: `${alto}px`,
      overflow: 'visible',
    },
    onclone: (clon) => {
      if (clon instanceof HTMLElement) {
        clon.style.overflow = 'visible';
      }
    },
  });

  descargarDataUrl(png, nombreArchivo);
}

export async function exportarOrganigramaConHtml2Canvas(elemento: HTMLElement, nombreArchivo = 'organigrama-fdma.png') {
  await document.fonts.ready;

  const desplazable = elemento.parentElement;
  const estilosOriginales = {
    overflow: desplazable?.style.overflow ?? '',
    overflowX: desplazable?.style.overflowX ?? '',
    width: elemento.style.width,
    bodyWidth: document.body.style.width,
    bodyOverflow: document.body.style.overflow,
  };

  try {
    const ancho = elemento.scrollWidth;
    const alto = elemento.scrollHeight;
    if (desplazable) {
      desplazable.style.overflow = 'visible';
      desplazable.style.overflowX = 'visible';
    }
    elemento.style.width = `${ancho}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'visible';

    const canvas = await html2canvas(elemento, {
      backgroundColor: '#f8f1e4',
      scale: 2,
      x: 0,
      y: 0,
      width: ancho,
      height: alto,
      windowWidth: ancho,
      windowHeight: alto,
      scrollX: 0,
      scrollY: -window.scrollY,
      useCORS: true,
      allowTaint: false,
      logging: false,
    });

    descargarDataUrl(canvas.toDataURL('image/png'), nombreArchivo);
  } finally {
    if (desplazable) {
      desplazable.style.overflow = estilosOriginales.overflow;
      desplazable.style.overflowX = estilosOriginales.overflowX;
    }
    elemento.style.width = estilosOriginales.width;
    document.body.style.width = estilosOriginales.bodyWidth;
    document.body.style.overflow = estilosOriginales.bodyOverflow;
  }
}
