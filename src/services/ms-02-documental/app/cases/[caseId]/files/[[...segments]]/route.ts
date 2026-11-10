import { documentHttp } from '@/adapters/in/document-http';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{caseId:string;segments?:string[]}>};
async function handle(request: Request, context: Context) { const {caseId,segments}=await context.params; return documentHttp(request,caseId,segments??[]); }
export const GET=handle;
export const POST=handle;
export const PUT=handle;
export const DELETE=handle;