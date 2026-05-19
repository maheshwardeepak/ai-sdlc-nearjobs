package com.taskflowlite.comments;

import com.taskflowlite.auth.entity.User;
import com.taskflowlite.auth.repository.UserRepository;
import com.taskflowlite.comments.dto.CommentRequest;
import com.taskflowlite.comments.dto.CommentResponse;
import com.taskflowlite.comments.entity.Comment;
import com.taskflowlite.comments.repository.CommentRepository;
import com.taskflowlite.comments.service.CommentService;
import com.taskflowlite.common.exception.ForbiddenException;
import com.taskflowlite.common.exception.NotFoundException;
import com.taskflowlite.tasks.entity.Task;
import com.taskflowlite.tasks.repository.TaskRepository;
import com.taskflowlite.teams.entity.Team;
import com.taskflowlite.teams.service.TeamMembershipService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CommentServiceTest {

    private CommentRepository commentRepository;
    private TaskRepository taskRepository;
    private UserRepository userRepository;
    private TeamMembershipService teamMembershipService;
    private CommentService service;

    @BeforeEach
    void setup() {
        commentRepository = mock(CommentRepository.class);
        taskRepository = mock(TaskRepository.class);
        userRepository = mock(UserRepository.class);
        teamMembershipService = mock(TeamMembershipService.class);
        service = new CommentService(commentRepository, taskRepository, userRepository, teamMembershipService);
    }

    private Task task(UUID id, UUID teamId) {
        Task t = new Task();
        t.setId(id);
        Team team = new Team();
        team.setId(teamId);
        t.setTeam(team);
        return t;
    }

    private User user(UUID id, String name) {
        User u = new User();
        u.setId(id);
        u.setUsername(name);
        return u;
    }

    @Test
    void addCommentPersistsAndReturnsResponse() {
        UUID taskId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();
        Task t = task(taskId, teamId);
        User u = user(userId, "bob");

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(t));
        when(teamMembershipService.isMember(teamId, userId)).thenReturn(true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(u));
        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> {
            Comment c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        CommentResponse resp = service.addComment(taskId, new CommentRequest("hello"), userId);
        assertThat(resp.getContent()).isEqualTo("hello");
        assertThat(resp.getAuthorUsername()).isEqualTo("bob");
        assertThat(resp.getCreatedAt()).isNotNull();
        assertThat(resp.getUpdatedAt()).isNotNull();
    }

    @Test
    void addCommentFailsForNonMember() {
        UUID taskId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task(taskId, teamId)));
        when(teamMembershipService.isMember(teamId, userId)).thenReturn(false);

        assertThatThrownBy(() -> service.addComment(taskId, new CommentRequest("x"), userId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void editCommentByAuthorSucceeds() {
        UUID commentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        User author = user(userId, "alice");
        Task t = task(UUID.randomUUID(), UUID.randomUUID());

        Comment c = new Comment();
        c.setId(commentId);
        c.setAuthor(author);
        c.setTask(t);
        c.setContent("old");
        c.setCreatedAt(Instant.now());
        c.setUpdatedAt(Instant.now());

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(c));
        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> inv.getArgument(0));

        CommentResponse resp = service.editComment(commentId, new CommentRequest("new"), userId);
        assertThat(resp.getContent()).isEqualTo("new");
    }

    @Test
    void editCommentByOtherUserForbidden() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        Comment c = new Comment();
        c.setId(commentId);
        c.setAuthor(user(authorId, "alice"));
        c.setTask(task(UUID.randomUUID(), UUID.randomUUID()));
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(c));

        assertThatThrownBy(() -> service.editComment(commentId, new CommentRequest("x"), otherId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void deleteCommentByOtherUserForbidden() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        Comment c = new Comment();
        c.setId(commentId);
        c.setAuthor(user(authorId, "alice"));
        c.setTask(task(UUID.randomUUID(), UUID.randomUUID()));
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(c));

        assertThatThrownBy(() -> service.deleteComment(commentId, UUID.randomUUID()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void deleteCommentByAuthorSucceeds() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        Comment c = new Comment();
        c.setId(commentId);
        c.setAuthor(user(authorId, "alice"));
        c.setTask(task(UUID.randomUUID(), UUID.randomUUID()));
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(c));

        service.deleteComment(commentId, authorId);
        verify(commentRepository).delete(c);
    }

    @Test
    void listCommentsForUnknownTaskThrows() {
        UUID taskId = UUID.randomUUID();
        when(taskRepository.findById(taskId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.listCommentsForTask(taskId, UUID.randomUUID()))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void listCommentsReturnsOrdered() {
        UUID taskId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task(taskId, teamId)));
        when(teamMembershipService.isMember(teamId, userId)).thenReturn(true);

        Comment c1 = new Comment();
        c1.setId(UUID.randomUUID());
        c1.setTask(task(taskId, teamId));
        c1.setAuthor(user(UUID.randomUUID(), "u1"));
        c1.setContent("first");
        c1.setCreatedAt(Instant.now());
        c1.setUpdatedAt(Instant.now());

        when(commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId)).thenReturn(List.of(c1));

        List<CommentResponse> resp = service.listCommentsForTask(taskId, userId);
        assertThat(resp).hasSize(1);
        assertThat(resp.get(0).getContent()).isEqualTo("first");
    }
}