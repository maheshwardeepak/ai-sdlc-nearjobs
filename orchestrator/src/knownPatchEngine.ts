import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function write(file: string, content: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export function applyKnownPatch(projectName: string, category: string) {
  const root = path.resolve(process.cwd(), "projects", projectName);
  const patches: string[] = [];





  if (category === "MAVEN_DEPENDENCY_FAILURE") {
    patches.push("maven-dependency-refresh");

    execSync("mvn dependency:resolve", {
      cwd: path.join(root, "backend"),
      stdio: "ignore"
    });
  }

  if (category === "SPRING_BOOT_STARTUP_FAILURE") {
    patches.push("spring-restart");

    execSync(
      "docker compose -f infra/docker-compose.yml restart backend",
      {
        cwd: root,
        stdio: "ignore"
      }
    );
  }

  if (category === "DATABASE_CONNECTION_FAILURE") {
    patches.push("postgres-restart");

    execSync(
      "docker compose -f infra/docker-compose.yml restart postgres",
      {
        cwd: root,
        stdio: "ignore"
      }
    );
  }

  if (category === "REDIS_CONNECTION_FAILURE") {
    patches.push("redis-restart");

    execSync(
      "docker compose -f infra/docker-compose.yml restart redis",
      {
        cwd: root,
        stdio: "ignore"
      }
    );
  }

  if (category === "DOCKER_NETWORK_FAILURE") {
    patches.push("docker-network-recreate");

    execSync(
      "docker compose -f infra/docker-compose.yml down -v --remove-orphans",
      {
        cwd: root,
        stdio: "ignore"
      }
    );
  }


  if (category === "PORT_CONFLICT") {
    patches.push("docker-cleanup");

    execSync("docker compose -f infra/docker-compose.yml down -v --remove-orphans", {
      cwd: root,
      stdio: "ignore"
    });
  }

  if (category === "TYPESCRIPT_IMPORT_FAILURE") {
    patches.push("frontend-npm-install");

    execSync("npm install", {
      cwd: path.join(root, "frontend"),
      stdio: "ignore"
    });
  }


  if (category === "MISSING_BACKEND_JAR") {
    write(path.join(root, "backend/Dockerfile"), `FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY . .
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
`);
    patches.push("backend/Dockerfile");
  }

  if (category === "SPRING_BOOT_JAR_NOT_EXECUTABLE") {
    write(path.join(root, "backend/pom.xml"), `<project xmlns="http://maven.apache.org/POM/4.0.0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.5</version>
    <relativePath/>
  </parent>
  <groupId>com.nearjobs</groupId>
  <artifactId>nearjobs</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <properties>
    <java.version>21</java.version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>
`);
    patches.push("backend/pom.xml");
  }

  if (category === "MAVEN_MISSING_IN_CONTAINER") {
    write(path.join(root, "backend/Dockerfile"), `FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY . .
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
`);
    patches.push("backend/Dockerfile");
  }

  if (category === "NODE_WORKSPACE_DEPENDENCY_ERROR") {
    write(path.join(root, "frontend/package.json"), `{
  "name": "nearjobs-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^5.4.11"
  }
}
`);
    patches.push("frontend/package.json");
  }

  return {
    category,
    patched: patches.length > 0,
    patches
  };
}
