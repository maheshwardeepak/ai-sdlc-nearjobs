package com.taskflowlite.dashboard.controller;

import com.taskflowlite.dashboard.dto.DashboardResponse;
import com.taskflowlite.dashboard.service.DashboardService;
import com.taskflowlite.security.CurrentUser;
import com.taskflowlite.user.domain.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@PreAuthorize("isAuthenticated()")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardResponse> globalDashboard(@CurrentUser User user) {
        return ResponseEntity.ok(dashboardService.globalDashboard(user));
    }

    @GetMapping("/teams/{id}/dashboard")
    public ResponseEntity<DashboardResponse> teamDashboard(@PathVariable("id") Long teamId,
                                                          @CurrentUser User user) {
        return ResponseEntity.ok(dashboardService.teamDashboard(teamId, user));
    }
}