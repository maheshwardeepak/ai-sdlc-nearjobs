import fs from "fs";
import path from "path";

function write(file: string, content: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export function materializeDeployableApp(projectName: string) {
  const root = path.resolve(process.cwd(), "projects", projectName);

  write(path.join(root, "backend/Dockerfile"), `FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app
COPY . .
RUN chmod +x mvnw || true
RUN ./mvnw -q -DskipTests package
EXPOSE 8080
CMD ["java","-jar","target/*.jar"]
`);

  write(path.join(root, "backend/mvnw"), `#!/bin/sh
exec mvn "$@"
`);

  write(path.join(root, "backend/pom.xml"), `<project xmlns="http://maven.apache.org/POM/4.0.0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.nearjobs</groupId>
  <artifactId>nearjobs</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <properties>
    <java.version>21</java.version>
    <spring-boot.version>3.3.5</spring-boot.version>
  </properties>
  <dependencyManagement>
    <dependencies>
      <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-dependencies</artifactId>
        <version>\${spring-boot.version}</version>
        <type>pom</type>
        <scope>import</scope>
      </dependency>
    </dependencies>
  </dependencyManagement>
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
        <version>\${spring-boot.version}</version>
      </plugin>
    </plugins>
  </build>
</project>
`);

  write(path.join(root, "backend/src/main/java/com/nearjobs/NearJobsApplication.java"), `package com.nearjobs;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class NearJobsApplication {
  public static void main(String[] args) {
    SpringApplication.run(NearJobsApplication.class, args);
  }
}
`);

  write(path.join(root, "backend/src/main/java/com/nearjobs/HealthController.java"), `package com.nearjobs;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class HealthController {
  @GetMapping("/api/v1/status")
  public Map<String, Object> status() {
    return Map.of("app", "NearJobs", "status", "UP");
  }
}
`);

  write(path.join(root, "backend/src/main/resources/application.yml"), `server:
  port: 8080

management:
  endpoints:
    web:
      exposure:
        include: health,info
`);

  write(path.join(root, "frontend/Dockerfile"), `FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN corepack enable && pnpm install || npm install
COPY . .
RUN pnpm build || npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
`);

  write(path.join(root, "frontend/package.json"), `{
  "name": "nearjobs-frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^5.4.11",
    "typescript": "^5.6.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {}
}
`);

  write(path.join(root, "frontend/index.html"), `<div id="root"></div><script type="module" src="/src/App.tsx"></script>
`);

  write(path.join(root, "frontend/src/App.tsx"), `import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  return (
    <main style={{ fontFamily: "Inter, system-ui, sans-serif", padding: 32 }}>
      <h1>NearJobs</h1>
      <p>Hyperlocal hiring platform runtime is live.</p>
      <a href="/api/v1/status">Backend status</a>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
`);

  write(path.join(root, "frontend/tsconfig.json"), `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
`);

  write(path.join(root, "infra/docker-compose.yml"), `services:
  postgres:
    image: postgres:16-alpine
    container_name: nearjobs-postgres
    environment:
      POSTGRES_DB: nearjobs
      POSTGRES_USER: nearjobs
      POSTGRES_PASSWORD: nearjobs
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    container_name: nearjobs-redis
    ports:
      - "6379:6379"

  backend:
    build:
      context: ../backend
    container_name: nearjobs-backend
    ports:
      - "8080:8080"

  frontend:
    build:
      context: ../frontend
    container_name: nearjobs-frontend
    depends_on:
      - backend
    ports:
      - "3000:80"
`);

  fs.chmodSync(path.join(root, "backend/mvnw"), 0o755);

  return {
    projectName,
    root,
    materialized: true
  };
}
