export type RepairClassification = {
  category: string;
  confidence: number;
  recommendedAction: string;
};

export function classifyRuntimeFailure(logText: string): RepairClassification {
  const text = logText.toLowerCase();


  if (
    text.includes("copy target/*.jar") ||
    text.includes("lstat /target") ||
    text.includes("no such file or directory")
  ) {
    return {
      category: "MISSING_BACKEND_JAR",
      confidence: 0.97,
      recommendedAction: "Patch backend Dockerfile to use a Maven builder stage that packages the JAR inside Docker."
    };
  }

  if (text.includes("no main manifest attribute")) {
    return {
      category: "SPRING_BOOT_JAR_NOT_EXECUTABLE",
      confidence: 0.98,
      recommendedAction: "Patch pom.xml to use spring-boot-starter-parent and spring-boot-maven-plugin."
    };
  }

  if (text.includes("mvn: not found")) {
    return {
      category: "MAVEN_MISSING_IN_CONTAINER",
      confidence: 0.98,
      recommendedAction: "Use Maven builder image in backend Dockerfile."
    };
  }

  if (text.includes("unsupported url type") || text.includes("workspace:*")) {
    return {
      category: "NODE_WORKSPACE_DEPENDENCY_ERROR",
      confidence: 0.95,
      recommendedAction: "Normalize frontend package.json and Dockerfile for standalone build."
    };
  }

  if (text.includes("econnrefused")) {
    return {
      category: "SERVICE_NOT_RUNNING",
      confidence: 0.85,
      recommendedAction: "Inspect container status and service logs."
    };
  }

  return {
    category: "UNKNOWN_RUNTIME_FAILURE",
    confidence: 0.3,
    recommendedAction: "Collect logs and ask debug-fix-agent for patch."
  };
}
