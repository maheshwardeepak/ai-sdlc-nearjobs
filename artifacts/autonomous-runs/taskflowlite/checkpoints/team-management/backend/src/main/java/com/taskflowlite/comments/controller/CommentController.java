package com.taskflowlite.comments.controller;

import com.taskflowlite.auth.security.CurrentUser;
import com.taskflowlite.auth.security.UserPrincipal;
import com.taskflowlite.comments.dto.CommentRequest;
import com.taskflowlite.comments.dto.CommentResponse;
import com.taskflowlite.comments.service.CommentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@PreAuthorize("isAuthenticated()")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping("/tasks/{taskId}/comments")
    public List<CommentResponse> listComments(@PathVariable UUID taskId,
                                              @CurrentUser UserPrincipal principal) {
        return commentService.listCommentsForTask(taskId, principal.getId());
    }

    @PostMapping("/tasks/{taskId}/comments")
    public ResponseEntity<CommentResponse> addComment(@PathVariable UUID taskId,
                                                      @Valid @RequestBody CommentRequest request,
                                                      @CurrentUser UserPrincipal principal) {
        CommentResponse created = commentService.addComment(taskId, request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/comments/{id}")
    public CommentResponse editComment(@PathVariable UUID id,
                                       @Valid @RequestBody CommentRequest request,
                                       @CurrentUser UserPrincipal principal) {
        return commentService.editComment(id, request, principal.getId());
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable UUID id,
                                              @CurrentUser UserPrincipal principal) {
        commentService.deleteComment(id, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
