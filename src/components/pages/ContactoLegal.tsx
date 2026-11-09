import { CORREO_PRIVACIDAD, FACEBOOK_URL, INSTAGRAM_URL, INSTAGRAM_USUARIO } from '@/lib/legal';

// Medio de contacto para privacidad: el correo si ya existe; si no, las redes oficiales
export function ContactoLegal() {
  if (CORREO_PRIVACIDAD) {
    return <a href={`mailto:${CORREO_PRIVACIDAD}`} className="font-semibold text-[#2D7A3E] underline">{CORREO_PRIVACIDAD}</a>;
  }
  return (
    <>
      mensaje directo a nuestras redes oficiales:{' '}
      <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#2D7A3E] underline">Instagram {INSTAGRAM_USUARIO}</a>
      {' '}o{' '}
      <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#2D7A3E] underline">Facebook de FDMA</a>
    </>
  );
}
