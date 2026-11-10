import PDFDocument from 'pdfkit';
import { DocumentFailure } from '../../domain/documents.ts';
import { displayCell, type ReportContent } from '../../domain/reports.ts';
import type { ReportRenderer } from '../../application/ports/out/report-ports.ts';

export class ReportPdf implements ReportRenderer {
  async render(content: ReportContent, executive: boolean): Promise<Buffer> {
    const all=[content.title,...content.sections.flatMap(section=>[section.heading,section.body]),...content.sources.map(source=>source.label),...(content.table?content.table.columns.map(column=>column.label).concat(content.table.rows.flat()):[])].join('\n');
    if(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff\u20ac\u2018\u2019\u201c\u201d\u2013\u2014\u2022\u2026]/.test(all)) throw new DocumentFailure('VALIDATION','El PDF contiene caracteres no representables por la fuente; no se omitio contenido.');
    const document=new PDFDocument({size:'A4',margin:42,bufferPages:true,info:{Title:content.title,Author:'Asistente Lex'}});
    const chunks: Buffer[]=[];
    const finished=new Promise<Buffer>((resolve,reject)=>{document.on('data',chunk=>chunks.push(chunk));document.on('error',reject);document.on('end',()=>resolve(Buffer.concat(chunks)));});
    document.font('Helvetica').fontSize(9).text('Bolivia | Requiere revision profesional del abogado.').moveDown();
    document.font('Helvetica-Bold').fontSize(16).text(content.title).moveDown(0.5);
    for(const section of content.sections){document.font('Helvetica-Bold').fontSize(12).text(section.heading).moveDown(0.25);document.font('Helvetica').fontSize(executive?10:11).text(section.body,{lineGap:2}).moveDown(0.7);}
    if(content.table){document.font('Helvetica-Bold').fontSize(12).text('Resultado tabular').moveDown();for(const row of content.table.rows){document.font('Helvetica').fontSize(9).text(row.map((cell,index)=>content.table!.columns[index].label+': '+displayCell(cell,content.table!.columns[index].type)).join('\n')).moveDown();}}
    document.font('Helvetica-Bold').fontSize(10).text('Fuentes utilizadas');document.font('Helvetica').fontSize(9);
    for(const source of content.sources)document.text(source.kind+': '+source.label);
    const pages=document.bufferedPageRange().count;document.end();const bytes=await finished;
    if((executive&&pages!==1)||pages>40||bytes.length>10485760)throw new DocumentFailure('VALIDATION',executive?'El resumen no cabe completo en una pagina. No se guardo ni recorto contenido.':'El informe excede el limite de PDF. No se guardo ni recorto contenido.');
    return bytes;
  }
}