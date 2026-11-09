import { access, constants, stat } from 'node:fs/promises';

import type { ServiceConfig } from '../config';

// En local, el almacenamiento de archivos se emula con un volumen de Docker.
export async function isFileStorageAvailable(config: ServiceConfig): Promise<boolean> {
  if (!config.fileStoragePath) {
    return false;
  }

  try {
    const info = await stat(config.fileStoragePath);
    if (!info.isDirectory()) {
      return false;
    }
    await access(config.fileStoragePath, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
