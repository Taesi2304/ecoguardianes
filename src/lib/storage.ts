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

// Copia una imagen pública (p. ej. la de una publicación de FB/IG) a otro bucket, para que no
// dependa de la original si después se borra. Si la copia falla, devuelve la URL original.
export async function copiarImagen(url: string, bucket: string, carpeta: string) {
  try {
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const blob = await respuesta.blob();
    const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const archivo = new File([blob], `imagen.${extension}`, { type: blob.type || 'image/jpeg' });
    return (await subirArchivo(bucket, carpeta, archivo)).url;
  } catch (error) {
    console.error('No se pudo copiar la imagen; se usa la original:', error);
    return url;
  }
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
