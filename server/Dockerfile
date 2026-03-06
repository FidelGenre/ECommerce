# ── Build Stage ──────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy pom.xml first (for layer caching dependencies)
COPY pom.xml .

RUN mvn dependency:go-offline -q

# Copy source and build the JAR (skip tests to speed up deploy)
COPY src src
RUN mvn package -DskipTests -q

# ── Runtime Stage ─────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=build /app/target/api-1.0.0.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
