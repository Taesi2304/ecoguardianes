import html2canvas from 'html2canvas';
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

export async function exportarOrganigrama(elemento: HTMLElement, nombreArchivo = 'organigrama-fdma.png') {
  await document.fonts.ready;

  const canvas = await html2canvas(elemento, {
    backgroundColor: '#f8f1e4',
    scale: 2,
    width: elemento.scrollWidth,
    height: elemento.scrollHeight,
    windowWidth: elemento.scrollWidth,
    windowHeight: elemento.scrollHeight,
    scrollX: 0,
    scrollY: 0,
    useCORS: true,
    allowTaint: false,
    logging: false,
    onclone: (documento) => {
      documento.querySelectorAll<HTMLElement>('*').forEach((nodo) => {
        nodo.style.setProperty('border-color', '#a9b5b8');
        nodo.style.setProperty('outline-color', '#a9b5b8');
      });
    },
  });

  const enlace = document.createElement('a');
  enlace.download = nombreArchivo;
  enlace.href = canvas.toDataURL('image/png');
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}
