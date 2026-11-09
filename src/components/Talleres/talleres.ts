import { formatearFecha, formatearHora } from '@/lib/utils';

export interface TallerPublico {
  id: string;
  titulo: string;
  facilitador: string | null;
  descripcion: string | null;
  imagen_url: string;
  fecha: string | null; // null = por confirmar (29_horario_por_confirmar.sql)
  hora_inicio: string | null;
  hora_fin: string | null;
  lugar: string;
  lugar_maps_url: string | null;
  cupo: number | null;
  inscritos: number;
  costo: number | null;
}

// Vista talleres_publicos (27_costo_talleres.sql): solo talleres activos de hoy en adelante
export const CAMPOS_TALLER_PUBLICO = 'id, titulo, facilitador, descripcion, imagen_url, fecha, hora_inicio, hora_fin, lugar, lugar_maps_url, cupo, inscritos, costo';

export const POR_CONFIRMAR = 'Por confirmar';

export const textoFecha = (fecha: string | null) => (fecha ? formatearFecha(fecha) : POR_CONFIRMAR);

// '09:00' → '09:00 h', con término '09:00 h – 11:00 h'; sin inicio, por confirmar
export function textoHorario(inicio: string | null, fin: string | null) {
  if (!inicio) return POR_CONFIRMAR;
  return `${formatearHora(inicio)}${fin ? ` – ${formatearHora(fin)}` : ''}`;
}

// null = gratuito
export function textoCosto(costo: number | null) {
  return costo === null ? 'Gratuito' : `Cuota de recuperación: ${Number(costo).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}`;
}

export function lugaresDisponibles(taller: TallerPublico) {
  return taller.cupo === null ? null : Math.max(taller.cupo - taller.inscritos, 0);
}
