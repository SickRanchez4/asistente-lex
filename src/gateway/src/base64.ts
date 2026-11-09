import { lexError } from './errors.ts';

/** Límite de carga de documentos y fotografías (spec 010), en bytes decodificados. */
export const MAX_UPLOAD_BYTES = 10_485_760;

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * Valida un binario Base64 recibido por GraphQL. El tamaño se calcula antes de
 * decodificar para no reservar memoria con cargas que superan el límite.
 */
export function decodeBase64(value: string, maxBytes: number, correlationId: string): Buffer {
  if (value.length % 4 !== 0 || !BASE64_PATTERN.test(value)) {
    throw lexError('VALIDATION', { message: 'El archivo no tiene una codificación Base64 válida.', correlationId });
  }
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  const declaredBytes = (value.length / 4) * 3 - padding;
  if (declaredBytes > maxBytes) {
    throw lexError('VALIDATION', { message: 'El archivo supera el tamaño máximo permitido.', correlationId });
  }
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length !== declaredBytes) {
    throw lexError('VALIDATION', { message: 'El archivo no tiene una codificación Base64 válida.', correlationId });
  }
  return bytes;
}
