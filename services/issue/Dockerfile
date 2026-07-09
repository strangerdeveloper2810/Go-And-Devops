# Multi-stage: build the Spring Boot fat jar, then run on a slim JRE.
# proto files live outside the module (../../proto) so the build context must be
# the repo root: `docker build -f services/issue/Dockerfile .`
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY proto ./proto
COPY services/issue ./services/issue
RUN mvn -q -f services/issue/pom.xml -DskipTests package

FROM eclipse-temurin:17-jre AS runtime
WORKDIR /app
COPY --from=build /workspace/services/issue/target/issue-service-*.jar app.jar
EXPOSE 8003 9003
ENTRYPOINT ["java", "-jar", "app.jar"]
