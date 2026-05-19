package com.taskflow;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class TaskflowApplicationTests {

    @Test
    void contextLoads() {
        // Verifies Spring context boots with test profile (H2).
    }
}
