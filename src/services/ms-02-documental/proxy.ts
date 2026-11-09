import { NextResponse, type NextRequest } from 'next/server';

import { loadConfig } from '@/infrastructure/config';
import { authenticateInternalRequest, UNAUTHENTICATED_BODY } from '@/infrastructure/security/internal-auth';

// Toda ruta salvo GET /health exige autenticación interna (spec 002).
// Los manejadores obtienen la identidad volviendo a verificar el contexto firmado.
export function proxy(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname === '/health' && request.method === 'GET') {
    return NextResponse.next();
  }
  const result = authenticateInternalRequest(request.headers, loadConfig());
  if (!result.authenticated) {
    return NextResponse.json(UNAUTHENTICATED_BODY, { status: 401 });
  }
  return NextResponse.next();
}
