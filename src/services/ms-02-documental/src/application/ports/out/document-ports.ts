import type { Classification, FileFormat, FileRecord } from '../../../domain/documents.ts';

export interface Scope { accountId: string; caseId: string }
export interface Actor { accountId: string; userId: string; role: string }
export interface FileFilter { name: string; classification: Classification | null; format: FileFormat | null; fromDate: string | null; toDate: string | null }
export interface Position { date: string; id: string }
export interface DocumentStore {
  stage(scope: Scope, id: string, file: { name: string; format: FileFormat; size: number; classification: Classification }): Promise<void>;
  publish(scope: Scope, id: string): Promise<FileRecord>;
  get(scope: Scope, id: string): Promise<FileRecord>;
  list(scope: Scope, filter: FileFilter, position: Position | null, limit: number, sources: boolean): Promise<FileRecord[]>;
  classify(scope: Scope, id: string, version: number, classification: Classification): Promise<FileRecord>;
  markDelete(scope: Scope, id: string, version: number): Promise<void>;
  finishDelete(scope: Scope, id: string): Promise<void>;
  read<T>(scope: Scope, id: string, reader: (file: FileRecord) => Promise<T>): Promise<T>;
  cleanup(id: string, remove: () => Promise<void>, staleOnly: boolean): Promise<void>;
}
export interface BinaryStore { write(id: string, bytes: Buffer): Promise<void>; read(id: string): Promise<Buffer>; remove(id: string): Promise<void> }
export interface FileInspector { validate(bytes: Buffer, format: FileFormat): Promise<void>; pdfText(bytes: Buffer): Promise<{ status: 'EXTRACTED' | 'NO_TEXT' | 'LIMIT_EXCEEDED'; text: string | null }> }
export interface CaseAuthority { authorize(actor: Actor, caseId: string, write: boolean): Promise<void> }