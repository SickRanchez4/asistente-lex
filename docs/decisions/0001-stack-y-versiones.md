# ADR 0001: Stack tecnológico y versiones

- **Estado:** Aceptado
- **Fecha:** 2026-10-31
- **Responsable:** responsable del proyecto
- **Spec relacionada:** [000-plataforma-base](../../specs/000-plataforma-base/spec.md)

## Contexto

La [especificación integral](../Asistente_Lex_Especificacion_Integral.md) (RNF-02, RNF-03, RNF-04 y RNF-06) fija las tecnologías de cada componente, pero para MS-03 y MS-04 solo indica el lenguaje (PHP y Python), sin framework. Tampoco define versiones.

Sin una decisión explícita, cada componente podría construirse con versiones incompatibles entre sí o sin soporte a mediano plazo.

## Opciones consideradas

- **Frameworks de MS-03 y MS-04:** Laravel o Symfony para PHP; FastAPI, Django o Flask para Python; o usar los lenguajes sin framework.
- **Versiones:** fijar ahora versiones concretas, o usar las LTS o estables vigentes al iniciar la implementación.

## Decisión

Stack por componente:

| Componente | Tecnología |
|---|---|
| MS-01 | Java / Spring Boot |
| MS-02 | Next.js / TypeScript |
| MS-03 | PHP / Laravel |
| MS-04 | Python / FastAPI |
| Gateway | Apollo Server / TypeScript |
| Application Shell | single-spa / TypeScript |
| Microfrontend del abogado | React |
| Microfrontend de administración | Angular |
| Persistencia | PostgreSQL, MongoDB y DynamoDB; almacenamiento de archivos (en local, volumen de Docker) |

Se usan las versiones LTS o estables vigentes al iniciar la implementación. Se fijaron el 2026-10-31 consultando endoflife.date, los registros de npm, PyPI y Packagist, Spring Initializr y Docker Hub:

| Elemento | Versión | Observaciones |
|---|---|---|
| Java (JDK) | 25 LTS (Eclipse Temurin 25.0.5) | Última versión LTS. Imágenes `eclipse-temurin:25-jdk` y `eclipse-temurin:25-jre`. |
| Spring Boot | 4.1.2 | Versión estable predeterminada en Spring Initializr. Construcción con el wrapper de Maven. |
| AWS SDK for Java | 2.46.7 | Cliente de DynamoDB para MS-01. |
| Node.js | 26 LTS (26.13.0) | LTS activa desde el 2026-10-28. Usado por MS-02, gateway y frontend. Imagen `node:26-alpine`. |
| Next.js | 16.4.3 | |
| TypeScript | 6.0.3 | Angular 22 exige TypeScript `>=6.0 <6.1`. Se usa la misma versión en todos los proyectos TypeScript, aunque la 7.0 es la última publicada. |
| PHP | 8.5 (8.5.12) | Última estable; Laravel 13 exige `^8.3`. Imagen `php:8.5-cli`. |
| Laravel | 13 (`laravel/laravel` 13.11.0, `laravel/framework` ^13.17) | Instalación con Composer 2.11. |
| Python | 3.15 (3.15.2) | Última estable; ya hay paquetes compilados de `pydantic-core` y `pymongo` para 3.15. Imagen `python:3.15-slim`. |
| FastAPI | 0.162.0 | Servido con Uvicorn 0.54.0. Cliente PyMongo 4.19.0 (API asíncrona). |
| Apollo Server | 5.5.1 | Exige `graphql` ^16.11, por lo que se usa `graphql` 16.14.2 y no la 17. Integración con Express 5 mediante `@as-integrations/express5` 1.1.2. |
| single-spa | 6.0.3 | Módulos en formato SystemJS (SystemJS 6.15.1), compatible con `single-spa-angular`. `single-spa-react` 6.0.2. |
| React | 19.3.1 | |
| Angular | 22.2.4 (CLI 22.2.5) | Última estable y compatible con `single-spa-angular` 22. |
| `single-spa-angular` | 22.0.1 | Admite `@angular/core >=22.0.0 <23.0.0`. Usa `@angular-builders/custom-webpack` 22.0.1. |
| webpack | 5.112.2 | Para el shell y el microfrontend React, con configuración propia: los presets `webpack-config-single-spa` 8 dependen de TypeScript 4 y babel-loader 8. |
| PostgreSQL | 18 (18.6) | Imagen `postgres:18-alpine`. |
| MongoDB | 9.0 (9.0.4) | Imagen `mongo:9.0`. |
| DynamoDB Local | 3.3.2 | Imagen `amazon/dynamodb-local:3.3.2`. |

## Consecuencias

- Los frameworks de MS-03 y MS-04 quedan definidos, aunque la especificación integral solo fija el lenguaje.
- Las versiones se eligen con información actualizada al momento de implementar, no al planificar.
- Si la última versión estable de Angular no es compatible con `single-spa-angular`, se elige la versión compatible más reciente y se indica en las observaciones.
- Actualizar una versión mayor posteriormente requiere actualizar este ADR.
