import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 'YYYY-MM-DD' se interpreta como UTC; se agrega hora local para no mostrar el día anterior
export function formatearFecha(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

// '14:30:00' → '14:30 h'
export function formatearHora(hora: string | null | undefined) {
  return hora ? `${hora.slice(0, 5)} h` : ''
}

// Enlace "Agregar a Google Calendar" sin API (fechas en hora local del evento)
export function enlaceGoogleCalendar(evento: { titulo: string; fecha: string; hora_inicio: string; hora_fin?: string | null; lugar?: string | null; descripcion?: string | null }) {
  const compacta = (hora: string) => `${evento.fecha.replace(/-/g, '')}T${hora.slice(0, 5).replace(':', '')}00`
  const fin = evento.hora_fin || `${String(Math.min(Number(evento.hora_inicio.slice(0, 2)) + 1, 23)).padStart(2, '0')}${evento.hora_inicio.slice(2)}`
  const parametros = new URLSearchParams({
    action: 'TEMPLATE',
    text: evento.titulo,
    dates: `${compacta(evento.hora_inicio)}/${compacta(fin)}`,
    ctz: 'America/Mexico_City',
    location: evento.lugar || '',
    details: evento.descripcion || '',
  })
  return `https://calendar.google.com/calendar/render?${parametros}`
}
