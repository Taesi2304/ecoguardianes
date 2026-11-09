// Catálogos y reglas compartidas por el formulario, los historiales y los reportes de bitácora.

export type Unidad = 'kg' | 'litros';
export type Tono = 'bien' | 'atencion' | 'alerta';

export interface Opcion<T extends string = string> {
  valor: T;
  etiqueta: string;
  detalle?: string;
  tono?: Tono;
}

export const OPCIONES_TEMPERATURA: Opcion<'fria' | 'tibia' | 'caliente'>[] = [
  { valor: 'fria', etiqueta: 'Fría', detalle: 'No se siente calor', tono: 'atencion' },
  { valor: 'tibia', etiqueta: 'Tibia', detalle: 'Calor suave al meter la mano', tono: 'bien' },
  { valor: 'caliente', etiqueta: 'Caliente', detalle: 'Calor intenso o sale vapor', tono: 'bien' },
];

export const OPCIONES_HUMEDAD: Opcion<'seco' | 'optimo' | 'excesivo'>[] = [
  { valor: 'seco', etiqueta: 'Seca', detalle: 'Se desmorona al apretar', tono: 'atencion' },
  { valor: 'optimo', etiqueta: 'Óptima', detalle: 'Como esponja exprimida', tono: 'bien' },
  { valor: 'excesivo', etiqueta: 'Excesiva', detalle: 'Gotea al apretar', tono: 'alerta' },
];

export const OPCIONES_OLOR: Opcion<'bosque' | 'sin_olor' | 'amoniaco'>[] = [
  { valor: 'bosque', etiqueta: 'Tierra de bosque', detalle: 'Olor a tierra húmeda', tono: 'bien' },
  { valor: 'sin_olor', etiqueta: 'Sin olor', detalle: 'No huele a nada en particular', tono: 'bien' },
  { valor: 'amoniaco', etiqueta: 'Amoniaco o podrido', detalle: 'Olor fuerte y desagradable', tono: 'alerta' },
];

export const OPCIONES_FAUNA: Opcion[] = [
  { valor: 'lombrices', etiqueta: 'Lombrices' },
  { valor: 'cochinillas', etiqueta: 'Cochinillas' },
  { valor: 'escarabajos', etiqueta: 'Escarabajos o larvas' },
  { valor: 'hormigas', etiqueta: 'Hormigas' },
  { valor: 'hongos', etiqueta: 'Hongos o micelio blanco' },
  { valor: 'moscas', etiqueta: 'Moscas o mosquitas' },
];

export const OPCIONES_RESIDUO: Opcion[] = [
  { valor: 'frutas', etiqueta: 'Frutas' },
  { valor: 'verduras', etiqueta: 'Verduras' },
  { valor: 'cafe', etiqueta: 'Café o té' },
  { valor: 'cascaron', etiqueta: 'Cascarón de huevo' },
  { valor: 'hojas_secas', etiqueta: 'Hojas secas' },
  { valor: 'carton', etiqueta: 'Cartón o papel' },
];

export function etiquetaDe(opciones: Opcion[], valor?: string | null) {
  return opciones.find((opcion) => opcion.valor === valor)?.etiqueta ?? valor ?? '';
}

export function opcionDe(opciones: Opcion[], valor?: string | null) {
  return opciones.find((opcion) => opcion.valor === valor);
}

// ---------- Visitas ----------

// Columnas de una visita que muestran los historiales
export const CAMPOS_VISITA = `
  id, usuario_id, fecha, cantidad_material, unidad_medida,
  tipos_residuo, residuo_otro, temperatura_nivel, humedad_nivel, olor_nivel, fauna,
  plagas, lixiviados, observaciones, propuesta_mejora
`;

export interface VisitaBitacora {
  id: string;
  usuario_id: string;
  fecha: string;
  cantidad_material: number | null;
  unidad_medida: string | null;
  tipos_residuo: string[] | null;
  residuo_otro: string | null;
  temperatura_nivel: string | null;
  humedad_nivel: string | null;
  olor_nivel: string | null;
  fauna: string[] | null;
  plagas: boolean;
  lixiviados: boolean;
  observaciones: string | null;
  propuesta_mejora: string | null;
  evidencias: { url_publica: string | null }[] | null;
}

export function residuosDe(visita: Pick<VisitaBitacora, 'tipos_residuo' | 'residuo_otro'>) {
  const residuos = (visita.tipos_residuo || []).map((valor) => etiquetaDe(OPCIONES_RESIDUO, valor));
  if (visita.residuo_otro) residuos.push(visita.residuo_otro);
  return residuos;
}

export function faunaDe(visita: Pick<VisitaBitacora, 'fauna'>) {
  return (visita.fauna || []).map((valor) => etiquetaDe(OPCIONES_FAUNA, valor));
}

export function diagnosticarVisita(visita: VisitaBitacora) {
  return diagnosticar({
    temperatura: visita.temperatura_nivel,
    humedad: visita.humedad_nivel,
    olor: visita.olor_nivel,
    plagas: visita.plagas,
    lixiviados: visita.lixiviados,
    fauna: visita.fauna,
  });
}

// ---------- Unidades ----------

export function abreviarUnidad(unidad?: string | null) {
  return unidad === 'litros' ? 'L' : 'kg';
}

export function formatearCantidad(cantidad?: number | string | null, unidad?: string | null) {
  const numero = Number(cantidad) || 0;
  return `${numero.toLocaleString('es-MX', { maximumFractionDigits: 1 })} ${abreviarUnidad(unidad)}`;
}

// Los registros viejos sin unidad se tomaron en kg
export function sumarPorUnidad(visitas: { cantidad_material: number | string | null; unidad_medida?: string | null }[]) {
  return visitas.reduce(
    (total, visita) => {
      const cantidad = Number(visita.cantidad_material) || 0;
      if (visita.unidad_medida === 'litros') total.litros += cantidad;
      else total.kg += cantidad;
      return total;
    },
    { kg: 0, litros: 0 },
  );
}

// ---------- Diagnóstico ----------

export interface EntradaDiagnostico {
  temperatura?: string | null;
  humedad?: string | null;
  olor?: string | null;
  plagas?: boolean;
  lixiviados?: boolean;
  fauna?: string[] | null;
}

export interface Diagnostico {
  estado: Tono;
  titulo: string;
  consejos: string[];
}

export function diagnosticar(entrada: EntradaDiagnostico): Diagnostico | null {
  const { temperatura, humedad, olor, plagas, lixiviados } = entrada;
  // Unas cuantas moscas no son plaga; si ya marcó "Plagas", ese consejo basta
  const moscas = !plagas && (entrada.fauna || []).includes('moscas');
  if (!temperatura && !humedad && !olor && !plagas && !lixiviados && !moscas) return null;

  const alertas: string[] = [];
  const atenciones: string[] = [];

  if (plagas) alertas.push('Cubre los restos frescos con una capa de material seco y evita carne, lácteos y comida cocinada.');
  if (lixiviados) alertas.push('Hay exceso de líquido: agrega hojas secas o cartón y revisa que el compostero drene.');
  if (humedad === 'excesivo' && !lixiviados) alertas.push('Está demasiado húmeda: agrega material seco y voltea para que entre aire.');
  if (olor === 'amoniaco') alertas.push('Le falta aire o tiene demasiados restos verdes: voltea la mezcla y agrega material seco.');

  if (moscas) atenciones.push('Unas cuantas moscas son normales: tapa los restos frescos con hojas secas o tierra para que no lleguen más.');
  if (humedad === 'seco') atenciones.push('Humedécela poco a poco hasta que se sienta como una esponja exprimida.');
  if (temperatura === 'fria') {
    atenciones.push(humedad === 'seco'
      ? 'La falta de humedad puede estar frenando la actividad.'
      : 'Poca actividad: agrega restos frescos y voltea para reactivarla. Si ya está madurando, es normal.');
  }

  if (alertas.length > 0) {
    return { estado: 'alerta', titulo: 'Necesita atención pronto', consejos: [...alertas, ...atenciones] };
  }
  if (atenciones.length > 0) {
    return { estado: 'atencion', titulo: 'Hay algo que ajustar', consejos: atenciones };
  }
  return {
    estado: 'bien',
    titulo: 'El compostero va bien',
    consejos: ['Las condiciones son buenas para que los microorganismos trabajen. Sigue así.'],
  };
}

// ---------- Fotografías ----------

// Reduce fotos de celular (5-10 MB) antes de subirlas
export async function comprimirImagen(archivo: File, ladoMaximo = 1600, calidad = 0.8): Promise<File> {
  if (!archivo.type.startsWith('image/') || archivo.type === 'image/gif') return archivo;

  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', calidad));
    if (!blob || blob.size >= archivo.size) return archivo;

    const nombre = archivo.name.replace(/\.[^.]+$/, '') || 'evidencia';
    return new File([blob], `${nombre}.jpg`, { type: 'image/jpeg' });
  } catch {
    return archivo;
  }
}
