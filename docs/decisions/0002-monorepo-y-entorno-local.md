# ADR 0002: Monorepo y entorno local

- **Estado:** Aceptado
- **Fecha:** 2026-10-31
- **Actualización:** 2026-11-08: PostgreSQL y MongoDB externos.
- **Responsable:** responsable del proyecto
- **Spec relacionada:** [000-plataforma-base](../../specs/000-plataforma-base/spec.md)

## Contexto

Asistente Lex tiene ocho componentes: cuatro microservicios, un gateway, un Application Shell y dos microfrontends, además de cuatro tipos de almacenamiento. Cada componente usa una tecnología distinta.

Un desarrollador debe poder preparar y ejecutar el sistema completo en local siguiendo documentación, y también trabajar sobre un componente concreto con las herramientas habituales de su tecnología. El MVP requiere DynamoDB, que es un servicio de AWS, y almacenamiento de archivos u objetos para MS-02.

Al iniciar la implementación se comprobó que MinIO, elegido inicialmente para el almacenamiento de objetos, ya no publica imágenes públicas: el repositorio de Docker Hub no existe y el de quay.io exige autenticación.

## Opciones consideradas

- **Organización del código:**
  - Monorepo con una carpeta por componente.
  - Un repositorio por componente.
- **Ejecución local:**
  - Docker Compose para almacenes y componentes, con ejecución directa opcional.
  - Docker Compose solo para almacenes; componentes instalados directamente.
  - Instalación directa de todo, sin contenedores.
- **DynamoDB en local:**
  - DynamoDB Local en contenedor.
  - LocalStack.
  - Servicios reales de AWS en una cuenta de desarrollo.
- **Almacenamiento de archivos de MS-02 en local:**
  - MinIO (descartado: sin imágenes públicas disponibles).
  - Emuladores compatibles con S3: Garage, RustFS o LocalStack.
  - Volumen de Docker montado solo en MS-02.

## Decisión

- Monorepo con una carpeta por componente dentro de `src/`.
- Docker Compose en la raíz para DynamoDB Local y los ocho componentes. PostgreSQL y MongoDB se conectan a instancias externas suministradas por el responsable; no se despliegan ni administran desde Compose. Cada componente puede ejecutarse también directamente.
- DynamoDB Local para DynamoDB.
- Un volumen de Docker montado únicamente en MS-02 para emular el almacenamiento de archivos. La sección 3.2 de la especificación integral admite "almacenamiento de archivos u objetos". MS-02 accede a los archivos mediante un puerto de almacenamiento, para poder sustituir esta emulación por almacenamiento de objetos en otros entornos sin cambiar las capas de dominio y aplicación.
- Esta decisión solo cubre el entorno local. Otros entornos y su despliegue se definirán en una spec posterior.

## Consecuencias

- Las specs que abarcan varios componentes se implementan y revisan en un único repositorio.
- Cada componente mantiene sus propias dependencias y puede construirse por separado.
- La emulación de DynamoDB no requiere cuentas ni costos de AWS. PostgreSQL y MongoDB externos requieren conectividad, credenciales y los recursos del proveedor elegido.
- DynamoDB Local no aplica permisos. En local, el aislamiento depende de que solo MS-01 tenga su configuración.
- El volumen de archivos no emula la API de S3. Su aislamiento depende de que solo esté montado en MS-02, y el adaptador de almacenamiento de objetos deberá implementarse cuando se especifiquen otros entornos.
- El entorno completo requiere recursos suficientes para ejecutar varios contenedores a la vez.
- El aprovisionamiento PostgreSQL se realiza mediante un script psql, no automáticamente al levantar Compose. Los volúmenes anteriores de PostgreSQL y MongoDB no se eliminan ni migran automáticamente.
