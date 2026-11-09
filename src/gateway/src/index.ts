import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';
import express from 'express';

import { loadConfig } from './config/config.ts';
import { createResolvers } from './resolvers/platform.ts';
import { typeDefs } from './schema/schema.ts';

const config = loadConfig();

const server = new ApolloServer({ typeDefs, resolvers: createResolvers(config) });
await server.start();

const app = express();
app.disable('x-powered-by');

// Rechaza explícitamente los orígenes no configurados, en lugar de
// depender solo de que el navegador bloquee la respuesta.
app.use((request, response, next) => {
  const origin = request.headers.origin;
  if (origin && !config.corsOrigins.includes(origin)) {
    response.status(403).json({ error: 'Origen no permitido' });
    return;
  }
  next();
});

app.use('/graphql', cors({ origin: config.corsOrigins }), express.json(), expressMiddleware(server));

app.listen(config.port, () => {
  console.log(`[gateway] GraphQL disponible en el puerto ${config.port} (/graphql)`);
});
