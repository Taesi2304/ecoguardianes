export interface TallerPublico {
  id: string;
  titulo: string;
  facilitador: string | null;
  descripcion: string | null;
  imagen_url: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  lugar: string;
  lugar_maps_url: string | null;
  cupo: number | null;
  inscritos: number;
}

// Vista talleres_publicos (11_talleres.sql): solo talleres activos de hoy en adelante
export const CAMPOS_TALLER_PUBLICO = 'id, titulo, facilitador, descripcion, imagen_url, fecha, hora_inicio, hora_fin, lugar, lugar_maps_url, cupo, inscritos';

export function lugaresDisponibles(taller: TallerPublico) {
  return taller.cupo === null ? null : Math.max(taller.cupo - taller.inscritos, 0);
}
