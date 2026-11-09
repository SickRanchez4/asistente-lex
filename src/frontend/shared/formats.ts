const NO_DATA = 'Sin dato';
const integerFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const eventFormat = new Intl.DateTimeFormat('es-BO', {
  timeZone: 'America/La_Paz',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function validateCivilDate(value: string): void {
  if (typeof value !== 'string') throw new RangeError('La fecha civil debe ser una cadena ISO.');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError('Fecha civil inválida.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError('Fecha civil inválida.');
  }
}

export function formatCivilDate(value: string | null | undefined): string {
  if (value === null || value === undefined) return NO_DATA;
  validateCivilDate(value);
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

export function formatEventDateTime(value: string | Date | null | undefined): string {
  if (value === null || value === undefined) return NO_DATA;
  if (typeof value === 'string') {
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!match || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4] ?? 0) > 59) {
      throw new RangeError('El evento requiere fecha, hora y zona válidas.');
    }
    validateCivilDate(match[1]);
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) throw new RangeError('Fecha de evento inválida.');
  const parts = eventFormat.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes): string => {
    const result = parts.find((item) => item.type === type);
    if (!result) throw new Error('No se pudo presentar la fecha del evento.');
    return result.value;
  };
  return `${part('day')}/${part('month')}/${part('year').padStart(4, '0')} ${part('hour')}:${part('minute')}`;
}

export function formatBOB(value: string | null | undefined): string {
  if (value === null || value === undefined) return NO_DATA;
  if (typeof value !== 'string') throw new RangeError('El importe BOB debe ser una cadena decimal exacta.');
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) throw new RangeError('Importe BOB inválido; se requieren como máximo dos decimales.');
  const integer = BigInt(match[2]);
  const fraction = (match[3] ?? '').padEnd(2, '0');
  const negative = match[1] === '-' && (integer !== 0n || fraction !== '00');
  return `BOB ${negative ? '-' : ''}${integerFormat.format(integer)},${fraction}`;
}
