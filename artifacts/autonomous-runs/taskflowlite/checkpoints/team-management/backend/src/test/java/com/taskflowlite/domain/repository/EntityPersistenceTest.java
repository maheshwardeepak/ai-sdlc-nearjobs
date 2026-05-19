package com.taskflowlite.domain.repository;

import com.taskflowlite.domain.entity.*;
import com.taskflowlite.domain.enums.Role;
import com.taskflowlite.domain.enums.TaskPriority;
import com.taskflowlite.domain.enums.TaskStatus;
import com.taskflowlite.domain.enums.TeamRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@TestPropertySource(locations = "classpath:application-test.yml")
class EntityPersistenceTest {

    @Autowired UserRepository users;
    @Autowired TeamRepository teams;
    @Autowired TeamMemberRepository teamMembers;
    @Autowired TaskRepository tasks;
    @Autowired CommentRepository comments;
    @Autowired ActivityLogRepository activity;

    @Test
    void persistsFullGraph() {
        UserEntity u = new UserEntity();
        u.setEmail("a@b.com");
        u.setUsername("alice");
        u.setPasswordHash("hash");
        u.setRole(Role.ADMIN);
        u = users.save(u);

        TeamEntity t = new TeamEntity();
        t.setName("Team A");
        t.setOwner(u);
        t = teams.save(t);

        TeamMemberEntity tm = new TeamMemberEntity();
        tm.setTeam(t);
        tm.setUser(u);
        tm.setRoleInTeam(TeamRole.OWNER);
        teamMembers.save(tm);

        TaskEntity task = new TaskEntity();
        task.setTitle("First Task");
        task.setStatus(TaskStatus.TODO);
        task.setPriority(TaskPriority.HIGH);
        task.setDueDate(LocalDate.now().plusDays(3));
        task.setTeam(t);
        task.setCreatedBy(u);
        task.setAssignee(u);
        task = tasks.save(task);

        CommentEntity c = new CommentEntity();
        c.setTask(task);
        c.setAuthor(u);
        c.setContent("hello");
        comments.save(c);

        ActivityLogEntity log = new ActivityLogEntity();
        log.setTask(task);
        log.setActor(u);
        log.setAction("CREATED");
        log.setField("status");
        log.setNewValue("TODO");
        activity.save(log);

        assertThat(users.findByEmail("a@b.com")).isPresent();
        assertThat(teamMembers.findByTeamIdAndUserId(t.getId(), u.getId())).isPresent();
        assertThat(tasks.findByAssigneeId(u.getId())).hasSize(1);
        assertThat(comments.findByTaskIdOrderByCreatedAtAsc(task.getId())).hasSize(1);
        assertThat(activity.findByTaskIdOrderByCreatedAtAsc(task.getId())).hasSize(1);
        assertThat(tasks.countByStatus(TaskStatus.TODO)).isEqualTo(1);
    }
}
