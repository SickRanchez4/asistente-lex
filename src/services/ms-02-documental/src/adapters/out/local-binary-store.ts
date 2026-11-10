import { constants } from 'node:fs';
import { mkdir, open, rename, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import type { BinaryStore } from '../../application/ports/out/document-ports.ts';
import { identifier, MAX_FILE_BYTES } from '../../domain/documents.ts';

export class LocalBinaryStore implements BinaryStore {
  private root: string;
  constructor(root: string) { if (!root) throw new Error('Storage not configured'); this.root = resolve(root); }
  private path(id: string) { return join(this.root,identifier(id)); }
  async write(id: string, bytes: Buffer) {
    await mkdir(this.root,{recursive:true,mode:0o700});
    const temporary = this.path(id)+'.part';
    const file = await open(temporary,'wx',0o600);
    try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
    await rename(temporary,this.path(id));
    const directory = await open(this.root,'r');
    try { await directory.sync(); } finally { await directory.close(); }
  }
  async read(id: string) {
    const file = await open(this.path(id),constants.O_RDONLY|constants.O_NOFOLLOW);
    try { const stat = await file.stat(); if (!stat.isFile() || stat.size<1 || stat.size>MAX_FILE_BYTES) throw new Error('Invalid stored binary'); return await file.readFile(); }
    finally { await file.close(); }
  }
  async remove(id: string) {
    for (const file of [this.path(id),this.path(id)+'.part']) await unlink(file).catch(error=>{ if (error.code!=='ENOENT') throw error; });
    const directory = await open(this.root,'r').catch(error=>{ if (error.code==='ENOENT') return null; throw error; });
    if (directory) try { await directory.sync(); } finally { await directory.close(); }
  }
}