import { documentHttp } from '@/adapters/in/document-http';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request: Request, context: {params:Promise<{caseId:string}>}) { const {caseId}=await context.params; return documentHttp(request,caseId,[],true); }