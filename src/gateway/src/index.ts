import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';

import { loadConfig } from './config/config.ts';
import { createContextFactory, type GatewayContext } from './context.ts';
import { createAuthResolvers } from './resolvers/auth.ts';
import { createAdminResolvers } from './resolvers/admin.ts';
import { createAgentResolvers } from './resolvers/agents.ts';
import { createPeopleResolvers } from './resolvers/people.ts';
import { createCaseResolvers } from './resolvers/cases.ts';
import { createParticipantResolvers } from './resolvers/participants.ts';
import { createCaseRecordResolvers } from './resolvers/case-records.ts';
import { formatGraphQLError } from './errors.ts';
import { createResolvers } from './resolvers/platform.ts';
import { typeDefs } from './schema/schema.ts';

const config = loadConfig();
const platformResolvers = createResolvers(config);
const authResolvers = createAuthResolvers(config);
const adminResolvers = createAdminResolvers(config);
const agentResolvers = createAgentResolvers(config);
const peopleResolvers = createPeopleResolvers(config);
const caseResolvers = createCaseResolvers(config);
const participantResolvers = createParticipantResolvers(config);
const caseRecordResolvers = createCaseRecordResolvers(config);

const server = new ApolloServer<GatewayContext>({
  typeDefs,
  resolvers: { Query: { ...platformResolvers.Query, ...authResolvers.Query, ...adminResolvers.Query, ...agentResolvers.Query, ...peopleResolvers.Query, ...caseResolvers.Query, ...participantResolvers.Query, ...caseRecordResolvers.Query },
    Mutation: { ...authResolvers.Mutation, ...adminResolvers.Mutation, ...agentResolvers.Mutation, ...peopleResolvers.Mutation, ...caseResolvers.Mutation, ...participantResolvers.Mutation, ...caseRecordResolvers.Mutation } },
  includeStacktraceInErrorResponses: false,
  formatError: formatGraphQLError,
});
await server.start();

const app = express();
app.disable('x-powered-by');

// Rechaza explícitamente los orígenes no configurados, en lugar de
// depender solo de que el navegador bloquee la respuesta.
app.use((request, response, next) => {
  const origin = request.headers.origin;
  if (origin && !config.corsOrigins.includes(origin)) {
    response.status(403).json({ errors: [{ message: 'Origen no permitido.', extensions: { code: 'FORBIDDEN' } }] });
    return;
  }
  next();
});

app.use(
  '/graphql',
  cors({ origin: config.corsOrigins, credentials: true, allowedHeaders: ['content-type', 'x-lex-request'] }),
  (request, response, next) => {
    if (request.method !== 'POST' || request.headers['x-lex-request'] !== '1' || !request.is('application/json')) {
      response.status(403).json({ errors: [{ message: 'Solicitud no permitida.', extensions: { code: 'FORBIDDEN' } }] });
      return;
    }
    response.setHeader('Cache-Control', 'no-store');
    next();
  },
  // El límite se aplica al cuerpo codificado, antes de interpretar el JSON.
  express.json({ limit: config.maxRequestBodyBytes }),
  expressMiddleware(server, { context: createContextFactory(config) }),
);

// Errores previos a GraphQL (cuerpo excesivo o JSON inválido) con el mismo formato y sin trazas.
const handleRequestError: ErrorRequestHandler = (error, _request, response, _next) => {
  const status = typeof error?.status === 'number' && error.status >= 400 && error.status < 500 ? error.status : 500;
  const message =
    status === 413
      ? 'La solicitud supera el tamaño máximo permitido.'
      : status < 500
        ? 'La solicitud no es válida.'
        : 'Se produjo un error interno. La operación no se completó.';
  if (status === 500) {
    console.error('[gateway] error no controlado al procesar la solicitud');
  }
  response.status(status).json({ errors: [{ message, extensions: { code: status < 500 ? 'VALIDATION' : 'INTERNAL_ERROR' } }] });
};
app.use(handleRequestError);

app.listen(config.port, () => {
  console.log(`[gateway] GraphQL disponible en el puerto ${config.port} (/graphql)`);
});
