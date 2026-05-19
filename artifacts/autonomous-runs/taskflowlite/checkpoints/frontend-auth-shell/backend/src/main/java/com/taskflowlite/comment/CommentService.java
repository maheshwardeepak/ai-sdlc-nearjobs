package com.taskflowlite.comment;

import com.taskflowlite.activity.ActivityService;
import com.taskflowlite.task.Task;
import com.taskflowlite.task.TaskRepository;
import com.taskflowlite.team.TeamMembershipService;
import com.taskflowlite.user.User;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final TeamMembershipService membershipService;
    private final ActivityService activityService;

    public CommentService(CommentRepository commentRepository,
                          TaskRepository taskRepository,
                          TeamMembershipService membershipService,
                          ActivityService activityService) {
        this.commentRepository = commentRepository;
        this.taskRepository = taskRepository;
        this.membershipService = membershipService;
        this.activityService = activityService;
    }

    @Transactional
    public Comment create(User actor, Long taskId, String content) {
        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment content required");
        }
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        if (!membershipService.isMember(task.getTeam(), actor)) {
            throw new AccessDeniedException("Not a team member");
        }
        Comment c = new Comment();
        c.setTask(task);
        c.setAuthor(actor);
        c.setContent(content);
        Comment saved = commentRepository.save(c);
        activityService.recordCommentCreated(task, actor, saved.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Comment> list(User actor, Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        if (!membershipService.isMember(task.getTeam(), actor)) {
            throw new AccessDeniedException("Not a team member");
        }
        return commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId);
    }

    @Transactional
    public Comment edit(User actor, Long commentId, String content) {
        Comment c = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));
        if (!c.getAuthor().getId().equals(actor.getId())) {
            throw new AccessDeniedException("Only author can edit");
        }
        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment content required");
        }
        c.setContent(content);
        return commentRepository.save(c);
    }

    @Transactional
    public void delete(User actor, Long commentId) {
        Comment c = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));
        if (!c.getAuthor().getId().equals(actor.getId())) {
            throw new AccessDeniedException("Only author can delete");
        }
        Task task = c.getTask();
        Long commentId2 = c.getId();
        commentRepository.delete(c);
        activityService.recordCommentDeleted(task, actor, commentId2);
    }
}