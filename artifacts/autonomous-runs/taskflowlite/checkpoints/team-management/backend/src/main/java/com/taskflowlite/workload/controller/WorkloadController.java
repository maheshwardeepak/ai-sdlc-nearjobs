package com.taskflowlite.workload.controller;

import com.taskflowlite.security.CurrentUser;
import com.taskflowlite.workload.dto.TeamWorkloadDto;
import com.taskflowlite.workload.service.WorkloadService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/teams")
@PreAuthorize("isAuthenticated()")
public class WorkloadController {

    private final WorkloadService workloadService;

    public WorkloadController(WorkloadService workloadService) {
        this.workloadService = workloadService;
    }

    @GetMapping("/{id}/workload")
    public ResponseEntity<TeamWorkloadDto> teamWorkload(@PathVariable("id") Long teamId,
                                                        @CurrentUser Long userId) {
        return ResponseEntity.ok(workloadService.getTeamWorkload(teamId, userId));
    }
}
