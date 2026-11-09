FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q -B dependency:go-offline
COPY src src
RUN ./mvnw -q -B -DskipTests package && cp target/*.jar app.jar

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/app.jar app.jar
USER ubuntu
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
