import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Une clases de Tailwind resolviendo conflictos (ej: "px-2" + "px-4" => "px-4")
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
