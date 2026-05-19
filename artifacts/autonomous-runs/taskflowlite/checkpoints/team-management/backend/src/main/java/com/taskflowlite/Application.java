package com.taskflowlite;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Canonical Spring Boot application entry point.
 * Mirrors TaskFlowLiteApplication for tooling that discovers the
 * generated backend by scanning for an Application class.
 */
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
