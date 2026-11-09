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
