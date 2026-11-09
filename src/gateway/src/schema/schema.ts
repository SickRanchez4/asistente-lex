import { readdirSync, readFileSync } from 'node:fs';

// Los archivos .graphql son el contrato ejecutable: base.graphql declara las raíces
// y cada capacidad las extiende en su propio archivo.
const schemaDir = new URL('./', import.meta.url);

const capabilityFiles = readdirSync(schemaDir)
  .filter((file) => file.endsWith('.graphql') && file !== 'base.graphql')
  .sort();

export const typeDefs = ['base.graphql', ...capabilityFiles].map((file) => readFileSync(new URL(file, schemaDir), 'utf8'));
