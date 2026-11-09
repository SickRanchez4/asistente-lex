# Plataforma base

## Estado

En progreso; implementación inicial realizada, adaptación a bases externas pendiente de verificación.

## Fuente y trazabilidad

- Especificación integral: [Asistente Lex](../../docs/Asistente_Lex_Especificacion_Integral.md), secciones 2 (requisitos no funcionales) y 3 (arquitectura, persistencia por responsabilidad); requisitos RNF-01, RNF-02, RNF-03, RNF-04, RNF-05, RNF-06 y RNF-07.
- Constitución: [principios III, IV, V, VI, VII, X y XII](../../docs/constitution.md).

## Contexto y problema

Asistente Lex es un sistema distribuido: cuatro microservicios con tecnologías distintas, dos microfrontends integrados mediante single-spa, un gateway GraphQL y varias tecnologías de persistencia.

Sin una base común, cada funcionalidad tendría que resolver por su cuenta la estructura de los servicios, la configuración, la ejecución local y las conexiones a los almacenes, con riesgo de incumplir desde el inicio los límites arquitectónicos de la constitución.

Esta spec define la base técnica mínima, ejecutable y verificable sobre la que se construirán las demás specs. No implementa funcionalidades de negocio.

## Objetivos

- Disponer de los cuatro microservicios con su tecnología asignada y la separación en capas exigida.
- Disponer del Application Shell con los microfrontends React y Angular montados.
- Disponer del gateway Apollo en ejecución y con conectividad hacia los cuatro servicios.
- Conectar cada servicio únicamente con los almacenes que le corresponden.
- Permitir que un desarrollador prepare, ejecute y compruebe el sistema completo en local siguiendo documentación.

## No objetivos

- Implementar entidades de dominio, reglas de negocio o pantallas funcionales.
- Definir convenciones de contratos, modelo de errores o propagación de identidad (spec 002).
- Definir navegación, patrones visuales y componentes compartidos (spec 001).
- Implementar autenticación o autorización (spec 003).
- Implementar capacidades offline de la PWA (spec 013).
- Definir infraestructura y despliegue de entornos distintos del local; se especificarán en una spec posterior.
- Crear archivos de testing (constitución, principio XII).

## Usuarios y escenarios

- Como desarrollador, quiero preparar y ejecutar todos los componentes en local siguiendo instrucciones documentadas, para empezar a trabajar sin conocimiento previo del entorno.
- Como desarrollador, quiero que cada servicio tenga una estructura en capas ya establecida, para ubicar dominio, aplicación, puertos y adaptadores sin decidirlo en cada funcionalidad.
- Como responsable del proyecto, quiero que la base respete los límites de la constitución, para que las funcionalidades posteriores no los erosionen.

## Requisitos

### Funcionales

- El repositorio es un monorepo con una carpeta por componente dentro de `src/`.
- Existen cuatro microservicios con la tecnología asignada por RNF-02. Los frameworks de MS-03 y MS-04 fueron confirmados por el responsable del proyecto, ya que la especificación integral solo fija el lenguaje:
  - MS-01: Java / Spring Boot.
  - MS-02: Next.js / TypeScript.
  - MS-03: PHP / Laravel.
  - MS-04: Python / FastAPI.
- Cada microservicio separa dominio, casos de uso de aplicación, puertos y adaptadores/infraestructura. El dominio no depende de frameworks, controladores ni bases de datos.
- Cada microservicio expone por HTTP una comprobación técnica de disponibilidad que indica si el servicio está operativo y si accede a sus almacenes asignados.
- Existe un Application Shell con single-spa y TypeScript que registra y monta:
  - El microfrontend React, destinado al Abogado.
  - El microfrontend Angular, destinado al Administrador.
- Apollo Server se ejecuta como único punto GraphQL para ambos microfrontends y alcanza a los cuatro servicios por REST. La conectividad se comprueba mediante una operación técnica sin lógica de negocio.
- La persistencia se asigna según la sección 3.2 de la especificación integral:
  - MS-01: PostgreSQL para datos jurídicos y DynamoDB para eventos de acceso y auditoría.
  - MS-02: esquema PostgreSQL `documental` para metadatos de archivos e informes, y almacenamiento de archivos para el contenido de documentos, fotografías e informes.
  - MS-03: esquema PostgreSQL `erp` para datos ERP.
  - MS-04: MongoDB para conversaciones y configuración de agentes.
- Ningún servicio comparte tablas o colecciones con otro ni consulta sus datos directamente.
- Hay una instancia por tecnología: PostgreSQL externo 18.x, MongoDB externo y DynamoDB Local. PostgreSQL usa una base y tres esquemas (`juridico`, `documental`, `erp`) con un usuario de aplicación compartido. Cada servicio selecciona su esquema; el responsable acepta que los permisos del usuario permiten acceder a los tres, por lo que no existe aislamiento de seguridad entre ellos (ADR 0003).
- Docker Compose levanta DynamoDB Local y los componentes, no PostgreSQL ni MongoDB. La configuración admite TLS verificado para PostgreSQL y una URI del proveedor para MongoDB.
- Un script de aprovisionamiento prepara la base PostgreSQL, los esquemas y el usuario. No crea tablas ni registros de negocio o demo; estos corresponden a sus specs funcionales.
- En local, el almacenamiento de archivos de MS-02 se emula con un volumen de Docker montado únicamente en MS-02. Se usa en lugar de un emulador compatible con S3 porque MinIO dejó de publicar imágenes públicas, y la sección 3.2 de la especificación integral admite "almacenamiento de archivos u objetos". MS-02 accede a los archivos mediante un puerto de almacenamiento, de modo que en otros entornos pueda sustituirse por almacenamiento de objetos sin cambiar las capas de dominio y aplicación.
- Durante el desarrollo, cada componente puede ejecutarse también directamente, fuera de su contenedor, integrándose con el resto del entorno.
- Se usan las versiones LTS o estables vigentes al iniciar la implementación de entornos de ejecución, frameworks y motores. Las versiones elegidas se fijan en un ADR.
- La configuración de cada componente se obtiene del entorno, fuera del código. Se proporciona una configuración de ejemplo con valores ficticios.
- La documentación del repositorio describe los requisitos previos, cómo preparar y ejecutar cada componente y cómo comprobar que la base funciona.

### No funcionales

- Arquitectura: cumple los principios III (capas), IV (límites de servicios), V (comunicación) y VII (propiedad de datos) de la constitución.
- Seguridad: no se versionan secretos ni credenciales reales, y no aparecen en registros ni mensajes de error.
- Reproducibilidad: un desarrollador nuevo puede levantar el entorno usando solo la documentación.
- Independencia: la indisponibilidad de un servicio no impide que los demás arranquen ni que respondan su comprobación de disponibilidad.

## Criterios de aceptación

- [ ] Dadas las bases externas aprovisionadas y las conexiones configuradas, cuando un desarrollador sigue la documentación, entonces puede iniciar con Docker Compose DynamoDB Local, los cuatro servicios, el gateway y el Application Shell sin pasos no documentados.
- [ ] Dado el entorno en ejecución con Docker Compose, cuando un desarrollador detiene el contenedor de un componente y lo ejecuta directamente siguiendo la documentación, entonces el componente se integra con el resto del entorno.
- [ ] Dado el entorno en ejecución, cuando se consulta la comprobación de disponibilidad de cada servicio, entonces informa que está operativo y que accede a sus almacenes asignados.
- [ ] Dado un almacén detenido, cuando se consulta la comprobación del servicio que depende de él, entonces se informa como no disponible, no como operativo.
- [ ] Dado el Application Shell en ejecución, cuando se accede a la ruta del abogado, entonces se monta el microfrontend React; y cuando se accede a la ruta de administración, entonces se monta el microfrontend Angular.
- [ ] Dado el gateway en ejecución, cuando se ejecuta la operación técnica de conectividad, entonces informa la disponibilidad de cada uno de los cuatro servicios.
- [ ] Dado un servicio detenido, cuando se ejecuta la operación técnica de conectividad, entonces ese servicio aparece como no disponible y los demás se informan correctamente.
- [ ] Dado el código de cada servicio, cuando se revisa su estructura, entonces dominio, aplicación, puertos y adaptadores están separados y el dominio no importa frameworks ni clientes de persistencia.
- [ ] Dada la configuración de persistencia, cuando se revisa, entonces los tres consumidores PostgreSQL usan la misma base y usuario pero seleccionan su propio esquema; no existen tablas compartidas ni accesos entre dominios en el código, y solo MS-02 monta el volumen de archivos.
- [ ] Dado PostgreSQL 18.x y un administrador, cuando se ejecuta el script de aprovisionamiento y se repite, entonces existen una base y los tres esquemas del usuario de aplicación, sin duplicados ni registros de negocio o demo.
- [ ] Dado el repositorio, cuando se revisa, entonces no contiene secretos ni credenciales reales y la configuración de ejemplo solo usa valores ficticios.
- [ ] Dados los componentes de la base, cuando se revisan, entonces no contienen entidades ni reglas de negocio.

## Dependencias

- Internas: ninguna; es la primera spec.
- Externas: Docker y Docker Compose; PostgreSQL externo 18.x y MongoDB externo accesibles desde los componentes; psql 18 y un administrador para aprovisionar PostgreSQL; DynamoDB Local en contenedor; entornos de ejecución para componentes directos.
- Decisiones: las versiones concretas y las decisiones de arquitectura significativas se documentan en los ADR indicados en el plan.

## Preguntas abiertas

- Ninguna.
