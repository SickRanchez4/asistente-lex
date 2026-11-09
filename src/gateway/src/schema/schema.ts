// Contrato técnico de la spec 000. La spec 002 definirá las convenciones generales.
export const typeDefs = `#graphql
  enum ServiceStatus {
    "El servicio y sus almacenes están disponibles."
    UP
    "El servicio responde, pero algún almacén no está disponible."
    DOWN
    "El servicio no responde o excede el tiempo de espera."
    UNAVAILABLE
  }

  type ServiceHealth {
    name: String!
    status: ServiceStatus!
  }

  type PlatformStatus {
    services: [ServiceHealth!]!
  }

  type Query {
    platformStatus: PlatformStatus!
  }
`;
