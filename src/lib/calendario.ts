// Enlaces para agregar un evento al calendario del celular o la computadora, sin APIs:
// - Google Calendar: enlace web con el evento prellenado.
// - Apple / Outlook: archivo .ics (iPhone lo abre directo en su app Calendario).

export interface EventoAgendable {
  titulo: string;
  fecha: string; // 'YYYY-MM-DD'
  hora_inicio: string; // 'HH:MM' o 'HH:MM:SS'
  hora_fin?: string | null;
  lugar?: string | null;
  descripcion?: string | null;
}

const ZONA_HORARIA = 'America/Mexico_City';
// México centro no tiene horario de verano desde 2022: siempre UTC-6
const DESFASE_UTC_HORAS = 6;

// Sin hora de término se asume 1 hora (sin pasar de las 23:59)
function horaFin(evento: EventoAgendable) {
  if (evento.hora_fin) return evento.hora_fin.slice(0, 5);
  const [horas, minutos] = evento.hora_inicio.split(':').map(Number);
  const fin = Math.min(horas * 60 + minutos + 60, 23 * 60 + 59);
  return `${String(Math.floor(fin / 60)).padStart(2, '0')}:${String(fin % 60).padStart(2, '0')}`;
}

// 'YYYY-MM-DD' + 'HH:MM' → '20261002T194500'
const compacta = (fecha: string, hora: string) => `${fecha.replace(/-/g, '')}T${hora.slice(0, 5).replace(':', '')}00`;

export function enlaceGoogleCalendar(evento: EventoAgendable) {
  const parametros = new URLSearchParams({
    action: 'TEMPLATE',
    text: evento.titulo,
    dates: `${compacta(evento.fecha, evento.hora_inicio)}/${compacta(evento.fecha, horaFin(evento))}`,
    ctz: ZONA_HORARIA,
    location: evento.lugar || '',
    details: evento.descripcion || '',
  });
  return `https://calendar.google.com/calendar/render?${parametros}`;
}

// Hora local de CDMX → '20261003T014500Z' (UTC), que todas las apps de calendario entienden
function aUtc(fecha: string, hora: string) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [horas, minutos] = hora.split(':').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia, horas + DESFASE_UTC_HORAS, minutos))
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

// El formato .ics exige escapar \ ; , y saltos de línea
const escaparIcs = (texto: string) => texto.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export function contenidoIcs(evento: EventoAgendable) {
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FDMA//Festival del Medio Ambiente//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@fdma`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART:${aUtc(evento.fecha, evento.hora_inicio)}`,
    `DTEND:${aUtc(evento.fecha, horaFin(evento))}`,
    `SUMMARY:${escaparIcs(evento.titulo)}`,
    evento.lugar ? `LOCATION:${escaparIcs(evento.lugar)}` : '',
    evento.descripcion ? `DESCRIPTION:${escaparIcs(evento.descripcion)}` : '',
    // Recordatorio 1 hora antes
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escaparIcs(evento.titulo)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lineas.filter(Boolean).join('\r\n');
}

const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function agregarACalendarioApple(evento: EventoAgendable) {
  const url = `data:text/calendar;charset=utf-8,${encodeURIComponent(contenidoIcs(evento))}`;

  // En iPhone, abrir el .ics (sin descargarlo) muestra directo "Agregar al calendario"
  if (esIOS()) {
    window.location.href = url;
    return;
  }

  // En computadora o Android se descarga el archivo y se abre con la app de calendario
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${evento.titulo.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'evento'}.ics`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}
