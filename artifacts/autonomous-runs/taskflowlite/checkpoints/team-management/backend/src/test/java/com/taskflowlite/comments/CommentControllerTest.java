package com.taskflowlite.comments;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflowlite.comments.dto.CommentRequest;
import com.taskflowlite.comments.dto.CommentResponse;
import com.taskflowlite.comments.service.CommentService;
import com.taskflowlite.common.exception.ForbiddenException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class CommentControllerTest {

    private CommentService commentService;

    @BeforeEach
    void setUp() {
        commentService = Mockito.mock(CommentService.class);
    }

    @Test
    void listCommentsReturnsAuthorAndTimestamps() {
        UUID taskId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        Instant now = Instant.now();

        CommentResponse r = new CommentResponse(UUID.randomUUID(), taskId, authorId,
                "alice", "hello", now, now);
        when(commentService.listCommentsForTask(eq(taskId), eq(userId)))
                .thenReturn(List.of(r));

        List<CommentResponse> result = commentService.listCommentsForTask(taskId, userId);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAuthorUsername()).isEqualTo("alice");
        assertThat(result.get(0).getCreatedAt()).isEqualTo(now);
    }

    @Test
    void editCommentByNonAuthorIsForbidden() {
        UUID id = UUID.randomUUID();
        UUID otherUser = UUID.randomUUID();
        when(commentService.editComment(eq(id), any(), eq(otherUser)))
                .thenThrow(new ForbiddenException("Only the author may edit this comment"));

        assertThatThrownBy(() -> commentService.editComment(id, new CommentRequest("x"), otherUser))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void serializesCommentRequest() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        String json = mapper.writeValueAsString(new CommentRequest("test content"));
        assertThat(json).contains("test content");
    }
}
