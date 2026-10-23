// Formatos de dinero, fechas y etiquetas que se usan en toda la aplicacion.
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const numero = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const entero = new Intl.NumberFormat('es-VE');

export const dinero = (n) => '$' + numero.format(Number(n || 0));
export const dineroCorto = (n) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1000) return '$' + new Intl.NumberFormat('es-VE', { maximumFractionDigits: 1 }).format(v / 1000) + 'k';
  return '$' + entero.format(Math.round(v));
};
export const num = (n) => entero.format(Number(n || 0));
export const porcentaje = (n, decimales = 1) =>
  new Intl.NumberFormat('es-VE', { style: 'percent', maximumFractionDigits: decimales }).format(Number(n || 0));

const aFecha = (v) => (v instanceof Date ? v : typeof v === 'string' ? parseISO(v) : new Date(v));
export const fecha = (v) => (v ? format(aFecha(v), 'dd/MM/yyyy', { locale: es }) : '—');
export const fechaHora = (v) => (v ? format(aFecha(v), "dd/MM/yyyy '·' hh:mm a", { locale: es }) : '—');
export const fechaLarga = (v) => (v ? format(aFecha(v), "d 'de' MMMM 'de' yyyy", { locale: es }) : '—');
export const diaCorto = (v) => (v ? format(aFecha(v), 'd MMM', { locale: es }) : '');
export const hace = (v) => (v ? formatDistanceToNow(aFecha(v), { addSuffix: true, locale: es }) : '—');
export const isoDia = (d) => format(d, 'yyyy-MM-dd');

export const ESTADOS = {
  PENDIENTE: { etiqueta: 'Pendiente', color: 'var(--chart-3)', clase: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  PAGADA: { etiqueta: 'Pagado', color: 'var(--chart-5)', clase: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  ENVIADA: { etiqueta: 'Enviado', color: 'var(--chart-1)', clase: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' },
  ENTREGADA: { etiqueta: 'Entregado', color: 'var(--chart-2)', clase: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  CANCELADA: { etiqueta: 'Cancelado', color: 'var(--chart-4)', clase: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300' },
};

// Texto del boton para pasar al siguiente estado
export const ACCION_ESTADO = {
  PAGADA: 'Registrar pago',
  ENVIADA: 'Marcar como enviado',
  ENTREGADA: 'Confirmar entrega',
  CANCELADA: 'Cancelar pedido',
};

export const METODOS_PAGO = {
  PAGO_MOVIL: 'Pago móvil',
  TRANSFERENCIA: 'Transferencia',
  TARJETA: 'Tarjeta de débito/crédito',
  EFECTIVO: 'Efectivo',
  ZELLE: 'Zelle',
};

export const METODOS_ENTREGA = {
  ENVIO_NACIONAL: { nombre: 'Envío nacional', detalle: 'Por empresa de encomiendas' },
  DELIVERY: { nombre: 'Delivery', detalle: 'Entrega local en la ciudad' },
  RETIRO_TIENDA: { nombre: 'Retiro en tienda', detalle: 'El cliente lo busca' },
};

export const ROLES = {
  admin: 'Administrador',
  vendedor: 'Vendedor',
  cliente: 'Cliente',
};

export const iniciales = (nombre = '') =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
