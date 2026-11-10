export const MAX_FILE_BYTES = 10_485_760;
export const CLASSIFICATIONS = ['FILING', 'DECISION', 'EVIDENCE', 'OTHER'] as const;
export type Classification = typeof CLASSIFICATIONS[number];
export type FileFormat = 'PDF' | 'JPEG' | 'PNG';
export interface FileRecord {
  id: string; name: string; format: FileFormat; size: number; uploadedAt: string;
  classification: Classification; version: number; availability: 'AVAILABLE' | 'DELETE_PENDING';
}
export interface FileInput { name: string; contentType: string; base64: string; classification: Classification }
export class DocumentFailure extends Error {
  category: 'VALIDATION' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'SERVICE_UNAVAILABLE';
  fields?: { field: string; message: string }[];
  constructor(category: DocumentFailure['category'], message: string, fields?: { field: string; message: string }[]) { super(message); this.category = category; this.fields = fields; }
}
export function invalid(field: string, message: string): never { throw new DocumentFailure('VALIDATION', message, [{ field, message }]); }
export function identifier(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) invalid('id', 'Identificador invalido.');
  return value.toLowerCase();
}
export function classification(value: unknown): Classification {
  if (!CLASSIFICATIONS.includes(value as Classification)) invalid('classification', 'Selecciona una clasificacion valida.');
  return value as Classification;
}
export function fileInput(input: unknown): { name: string; format: FileFormat; bytes: Buffer; classification: Classification } {
  if (!input || typeof input !== 'object') invalid('file', 'Selecciona un archivo.');
  const value = input as Partial<FileInput>;
  const kind = classification(value.classification);
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 180 || /[\x00-\x1f\x7f/\\]/.test(value.name)) invalid('name', 'El nombre debe tener entre 1 y 180 caracteres, sin rutas ni controles.');
  const name = value.name.trim();
  const extension = name.split('.').pop()?.toLowerCase();
  const format: FileFormat | undefined = extension === 'pdf' ? 'PDF' : extension === 'jpg' || extension === 'jpeg' ? 'JPEG' : extension === 'png' ? 'PNG' : undefined;
  if (!format) invalid('file', 'Solo se admiten PDF, JPEG y PNG.');
  const contentType = { PDF: 'application/pdf', JPEG: 'image/jpeg', PNG: 'image/png' }[format];
  if (value.contentType !== contentType) invalid('file', 'El tipo y la extension del archivo no coinciden.');
  if (typeof value.base64 !== 'string' || value.base64.length === 0 || value.base64.length % 4 !== 0 || value.base64.length > 4 * Math.ceil(MAX_FILE_BYTES / 3) || !/^[A-Za-z0-9+/]*={0,2}$/.test(value.base64)) invalid('file', 'Base64 invalido o archivo superior a 10 MiB.');
  const bytes = Buffer.from(value.base64, 'base64');
  if (!bytes.length || bytes.length > MAX_FILE_BYTES || bytes.toString('base64') !== value.base64) invalid('file', 'Base64 invalido o archivo superior a 10 MiB.');
  const matches = format === 'PDF' ? bytes.subarray(0, 5).toString('ascii') === '%PDF-' : format === 'PNG' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!matches) invalid('file', 'Los bytes no corresponden al formato declarado.');
  return { name, format, bytes, classification: kind };
}
export function expectedVersion(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) invalid('expectedVersion', 'La version es obligatoria.');
  return value;
}