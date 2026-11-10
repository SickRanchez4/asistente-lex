import type { GraphQLFormattedError } from 'graphql';
import { GraphQLError } from 'graphql';

/**
 * Categorías comunes de error (spec 002). Se publican en `extensions.code`
 * de GraphQL y en el campo `category` de los errores REST.
 */
export const ERROR_CATEGORIES = [
  'VALIDATION',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'SERVICE_UNAVAILABLE',
  'PARTIAL_FAILURE',
] as const;

export type ErrorCategory = (typeof ERROR_CATEGORIES)[number];

export interface FieldError {
  field: string;
  message: string;
}

const DEFAULT_MESSAGES: Record<ErrorCategory | 'INTERNAL_ERROR', string> = {
  VALIDATION: 'Los datos enviados no son válidos.',
  UNAUTHENTICATED: 'Debes iniciar sesión para realizar esta operación.',
  FORBIDDEN: 'No tienes permiso para realizar esta operación.',
  NOT_FOUND: 'El recurso solicitado no existe.',
  CONFLICT: 'La operación no es posible en el estado actual.',
  SERVICE_UNAVAILABLE: 'El servicio no está disponible. La operación no se completó.',
  PARTIAL_FAILURE: 'La operación se completó solo parcialmente.',
  INTERNAL_ERROR: 'Se produjo un error interno. La operación no se completó.',
};

// Códigos propios de Apollo/GraphQL que describen una solicitud mal formada.
const REQUEST_ERROR_CODES = new Set([
  'GRAPHQL_PARSE_FAILED',
  'GRAPHQL_VALIDATION_FAILED',
  'BAD_USER_INPUT',
  'BAD_REQUEST',
  'OPERATION_RESOLUTION_FAILURE',
  'PERSISTED_QUERY_NOT_FOUND',
  'PERSISTED_QUERY_NOT_SUPPORTED',
]);

const MAX_MESSAGE_LENGTH = 500;

export function isErrorCategory(value: unknown): value is ErrorCategory {
  return typeof value === 'string' && (ERROR_CATEGORIES as readonly string[]).includes(value);
}

export function lexError(
  category: ErrorCategory,
  options: { message?: string; fields?: FieldError[]; correlationId?: string } = {},
): GraphQLError {
  return new GraphQLError(options.message ?? DEFAULT_MESSAGES[category], {
    extensions: {
      code: category,
      ...(options.fields?.length ? { fields: options.fields } : {}),
      ...(options.correlationId ? { correlationId: options.correlationId } : {}),
    },
  });
}

/** Mensaje de un servicio, solo si es texto acotado; si no, el de la categoría. */
export function safeMessage(category: ErrorCategory, value: unknown): string {
  if (typeof value === 'string' && value.trim() !== '' && value.length <= MAX_MESSAGE_LENGTH) {
    return value;
  }
  return DEFAULT_MESSAGES[category];
}

export function safeFieldErrors(value: unknown): FieldError[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const fields = value
    .filter(
      (item): item is FieldError =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.field === 'string' &&
        typeof item.message === 'string' &&
        item.field.length <= 200 &&
        item.message.length <= MAX_MESSAGE_LENGTH,
    )
    .map(({ field, message }) => ({ field, message }));
  return fields.length > 0 ? fields : undefined;
}

/**
 * Último filtro antes de responder: conserva solo categoría, mensaje seguro,
 * errores de campo y correlación. Lo desconocido se oculta como error interno.
 */
export function formatGraphQLError(formatted: GraphQLFormattedError): GraphQLFormattedError {
  const extensions = formatted.extensions ?? {};
  const code = extensions.code;

  if (isErrorCategory(code)) {
    return {
      message: formatted.message,
      locations: formatted.locations,
      path: formatted.path,
      extensions: {
        code,
        ...(typeof extensions.auditRecorded === 'boolean' ? { auditRecorded: extensions.auditRecorded } : {}),
        ...(extensions.fields ? { fields: extensions.fields } : {}),
        ...(extensions.correlationId ? { correlationId: extensions.correlationId } : {}),
      },
    };
  }

  if (typeof code === 'string' && REQUEST_ERROR_CODES.has(code)) {
    return { message: formatted.message, locations: formatted.locations, extensions: { code: 'VALIDATION' } };
  }

  console.error(`[gateway] error no clasificado (${typeof code === 'string' ? code : 'sin código'})`);
  return { message: DEFAULT_MESSAGES.INTERNAL_ERROR, path: formatted.path, extensions: { code: 'INTERNAL_ERROR' } };
}
