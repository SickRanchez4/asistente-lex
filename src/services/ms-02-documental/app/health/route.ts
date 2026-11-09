import { checkHealth } from '@/infrastructure/health/health-check';

// La comprobación debe ejecutarse en cada solicitud, nunca desde caché.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const result = await checkHealth();
  return Response.json(result.body, { status: result.httpStatus });
}
