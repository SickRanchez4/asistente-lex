import sharp from 'sharp';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import type { FileInspector } from '../../application/ports/out/document-ports.ts';
import { DocumentFailure, invalid, type FileFormat } from '../../domain/documents.ts';

async function pdf<T>(bytes: Buffer, work: (document: PDFDocumentProxy) => Promise<T>): Promise<T> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  GlobalWorkerOptions.workerSrc = pathToFileURL(join(process.cwd(),'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
  const task = getDocument({data:new Uint8Array(bytes),verbosity:0,stopAtErrors:true,useSystemFonts:false,disableFontFace:true,useWasm:false});
  let timedOut = false;
  const timer = setTimeout(()=>{timedOut=true;void task.destroy().catch(()=>undefined);},55000);
  try { const document = await task.promise; return await work(document); }
  catch { if (timedOut) throw new DocumentFailure('SERVICE_UNAVAILABLE','No se pudo completar la lectura del PDF.'); invalid('file','PDF ilegible, invalido o protegido.'); }
  finally { clearTimeout(timer); await task.destroy().catch(()=>undefined); }
}
export class ContentInspector implements FileInspector {
  async validate(bytes: Buffer, format: FileFormat) {
    if (format==='PDF') { await pdf(bytes,async document=>{ for (let pageNumber=1;pageNumber<=document.numPages;pageNumber++) { const page=await document.getPage(pageNumber); await page.getOperatorList(); page.cleanup(); } }); return; }
    try { await sharp(bytes,{failOn:'warning',sequentialRead:true}).stats(); }
    catch { invalid('file','La fotografia esta incompleta, es invalida o excede el limite seguro de descompresion.'); }
  }
  async pdfText(bytes: Buffer) {
    return pdf(bytes,async document=>{
      let text='';
      for (let pageNumber=1;pageNumber<=document.numPages;pageNumber++) {
        const page=await document.getPage(pageNumber);
        const content=await page.getTextContent();
        text+=content.items.map(item=>'str' in item ? item.str+('hasEOL' in item && item.hasEOL?'\n':' ') : '').join('')+'\n';
        page.cleanup();
        if (text.length>200000) return {status:'LIMIT_EXCEEDED' as const,text:null};
      }
      const result=text.trim();
      return result ? {status:'EXTRACTED' as const,text:result} : {status:'NO_TEXT' as const,text:null};
    });
  }
}