import { supabase } from './supabase';

export async function subirArchivo(bucket: string, carpeta: string, archivo: File) {
  const extension = archivo.name.split('.').pop()?.toLowerCase() || 'jpg';
  const ruta = `${carpeta}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(ruta, archivo, {
    cacheControl: '3600',
    contentType: archivo.type,
    upsert: false,
  });

  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(ruta);
  return { ruta, url: data.publicUrl };
}

// null si la URL no pertenece al bucket (p. ej. imágenes en /public)
export function rutaDesdeUrl(bucket: string, url: string) {
  const marcador = `/storage/v1/object/public/${bucket}/`;
  const indice = url.indexOf(marcador);
  return indice === -1 ? null : decodeURIComponent(url.slice(indice + marcador.length));
}

export async function borrarArchivos(bucket: string, urls: (string | null | undefined)[]) {
  const rutas = urls.map((url) => (url ? rutaDesdeUrl(bucket, url) : null)).filter((ruta): ruta is string => !!ruta);
  if (rutas.length > 0) await supabase.storage.from(bucket).remove(rutas);
}
