package com.taskflowlite.comments.service;

import com.taskflowlite.auth.entity.User;
import com.taskflowlite.auth.repository.UserRepository;
import com.taskflowlite.comments.dto.CommentRequest;
import com.taskflowlite.comments.dto.CommentResponse;
import com.taskflowlite.comments.entity.Comment;
import com.taskflowlite.comments.repository.CommentRepository;
import com.taskflowlite.common.exception.ForbiddenException;
import com.taskflowlite.common.exception.NotFoundException;
import com.taskflowlite.tasks.entity.Task;
import com.taskflowlite.tasks.repository.TaskRepository;
import com.taskflowlite.teams.service.TeamMembershipService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final TeamMembershipService teamMembershipService;

    public CommentService(CommentRepository commentRepository,
                          TaskRepository taskRepository,
                          UserRepository userRepository,
                          TeamMembershipService teamMembershipService) {
        this.commentRepository = commentRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.teamMembershipService = teamMembershipService;
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> listCommentsForTask(UUID taskId, UUID currentUserId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task not found"));
        ensureTaskAccess(task, currentUserId);
        return commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CommentResponse addComment(UUID taskId, CommentRequest request, UUID currentUserId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task not found"));
        ensureTaskAccess(task, currentUserId);

        User author = userRepository.findById(currentUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Comment comment = new Comment();
        comment.setTask(task);
        comment.setAuthor(author);
        comment.setContent(request.getContent().trim());
        Instant now = Instant.now();
        comment.setCreatedAt(now);
        comment.setUpdatedAt(now);

        Comment saved = commentRepository.save(comment);
        return toResponse(saved);
    }

    @Transactional
    public CommentResponse editComment(UUID commentId, CommentRequest request, UUID currentUserId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found"));

        if (!comment.getAuthor().getId().equals(currentUserId)) {
            throw new ForbiddenException("Only the author may edit this comment");
        }

        comment.setContent(request.getContent().trim());
        comment.setUpdatedAt(Instant.now());
        Comment saved = commentRepository.save(comment);
        return toResponse(saved);
    }

    @Transactional
    public void deleteComment(UUID commentId, UUID currentUserId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found"));

        if (!comment.getAuthor().getId().equals(currentUserId)) {
            throw new ForbiddenException("Only the author may delete this comment");
        }

        commentRepository.delete(comment);
    }

    private void ensureTaskAccess(Task task, UUID userId) {
        if (task.getTeam() != null
                && !teamMembershipService.isMember(task.getTeam().getId(), userId)) {
            throw new ForbiddenException("You do not have access to this task");
        }
    }

    private CommentResponse toResponse(Comment c) {
        return new CommentResponse(
                c.getId(),
                c.getTask().getId(),
                c.getAuthor().getId(),
                c.getAuthor().getUsername(),
                c.getContent(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}
