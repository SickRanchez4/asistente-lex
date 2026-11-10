export class GraphqlFailure extends Error {
  constructor(readonly category: string, message: string, readonly uncertain = false,
    readonly fields: readonly { field: string; message: string }[] = []) { super(message); }
}

export async function requestGraphql<T>(query: string, variables: Record<string, unknown> = {}, signal?: AbortSignal, timeoutMs = 12_000): Promise<T> {
  let response: Response;
  let body: { data?: T; errors?: { message?: string; extensions?: { code?: string; fields?: unknown } }[] };
  try {
    response = await fetch('/graphql', { method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'content-type': 'application/json', 'x-lex-request': '1' }, body: JSON.stringify({ query, variables }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs) });
    body = await response.json();
  } catch { throw new GraphqlFailure('SERVICE_UNAVAILABLE', 'No se pudo confirmar el resultado. Comprueba el estado antes de repetir la operación.', true); }
  if (body.errors?.length) {
    const error = body.errors[0];
    const known = ['VALIDATION', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'SERVICE_UNAVAILABLE', 'PARTIAL_FAILURE'];
    const category = known.includes(error.extensions?.code ?? '') ? error.extensions!.code! : 'SERVICE_UNAVAILABLE';
    const fields = Array.isArray(error.extensions?.fields) ? error.extensions.fields.filter(
      (value): value is { field: string; message: string } => value != null && typeof value === 'object'
        && typeof value.field === 'string' && value.field.length <= 200 && typeof value.message === 'string' && value.message.length <= 500,
    ).slice(0, 20).map(({ field, message }) => ({ field, message })) : [];
    throw new GraphqlFailure(category, typeof error.message === 'string' && error.message.length <= 500 ? error.message : 'La operación no está disponible.', category === 'SERVICE_UNAVAILABLE', fields);
  }
  if (!response.ok || !body.data) throw new GraphqlFailure('SERVICE_UNAVAILABLE', 'No se pudo confirmar la operación.', true);
  return body.data;
}