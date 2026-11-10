export class GraphqlFailure extends Error {
  constructor(readonly category: string, message: string, readonly uncertain = false) { super(message); }
}

export async function requestGraphql<T>(query: string, variables: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
  let response: Response;
  let body: { data?: T; errors?: { message?: string; extensions?: { code?: string } }[] };
  try {
    response = await fetch('/graphql', { method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'content-type': 'application/json', 'x-lex-request': '1' }, body: JSON.stringify({ query, variables }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12_000)]) : AbortSignal.timeout(12_000) });
    body = await response.json();
  } catch { throw new GraphqlFailure('SERVICE_UNAVAILABLE', 'No se pudo confirmar el resultado. Comprueba el estado antes de repetir la operación.', true); }
  if (body.errors?.length) {
    const error = body.errors[0];
    const known = ['VALIDATION', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'SERVICE_UNAVAILABLE'];
    const category = known.includes(error.extensions?.code ?? '') ? error.extensions!.code! : 'SERVICE_UNAVAILABLE';
    throw new GraphqlFailure(category, typeof error.message === 'string' && error.message.length <= 500 ? error.message : 'La operación no está disponible.', category === 'SERVICE_UNAVAILABLE');
  }
  if (!response.ok || !body.data) throw new GraphqlFailure('SERVICE_UNAVAILABLE', 'No se pudo confirmar la operación.', true);
  return body.data;
}