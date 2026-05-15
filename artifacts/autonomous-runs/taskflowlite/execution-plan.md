# Execution Plan: TaskFlowLite

## Approval Model
- Human approval is required once before autonomous execution.
- After approval, all phases run automatically.
- Failed build/test/runtime checks are repaired by the factory and retried automatically.
- No additional approval is required between phases unless the project plan changes.

## Autonomous Phases
1. Project Foundation & Tooling
   - ID: foundation-setup
   - Goal: Initialize Spring Boot Maven backend and Vite React TS frontend with PostgreSQL config, base configs, linting, and health endpoint.
   - Autonomous: true
   - Requires human approval: true

2. Database Schema & Migrations
   - ID: database-schema
   - Goal: Define PostgreSQL schema and JPA entities for User, Team, TeamMembership, Task, Comment, ActivityLog with Flyway migrations.
   - Autonomous: true
   - Requires human approval: false

3. Authentication, JWT & Password Security
   - ID: auth-security-jwt
   - Goal: Implement registration, login, BCrypt password hashing, JWT issuance/validation, Spring Security filter chain, and /auth/me profile endpoint.
   - Autonomous: true
   - Requires human approval: false

4. Role-Based Access Control
   - ID: rbac-authorization
   - Goal: Implement ADMIN/MANAGER/MEMBER roles, method-level security, and endpoint authorization rules across the API.
   - Autonomous: true
   - Requires human approval: false

5. Task Management Core
   - ID: task-management-core
   - Goal: Implement CRUD for tasks with title, description, priority, due date, and TODO/IN_PROGRESS/DONE statuses with validation.
   - Autonomous: true
   - Requires human approval: false

6. Team Management & Collaboration
   - ID: team-collaboration
   - Goal: Implement team creation, member invitation/removal, task assignment/reassignment, workload view, and assignee/unassigned filters.
   - Autonomous: true
   - Requires human approval: false

7. Task Comments
   - ID: task-comments
   - Goal: Implement add/edit/delete own comments with author and timestamp metadata exposed via API.
   - Autonomous: true
   - Requires human approval: false

8. Activity Audit Logging
   - ID: activity-audit-log
   - Goal: Capture activity events for task creation, status/priority/due-date/assignee changes, and comment create/delete; expose timeline API.
   - Autonomous: true
   - Requires human approval: false

9. Dashboards & Reporting
   - ID: dashboard-metrics
   - Goal: Provide global and team-level dashboards with task counts by status and workload aggregations.
   - Autonomous: true
   - Requires human approval: false

10. Frontend Auth Shell & Routing
   - ID: frontend-auth-shell
   - Goal: Build React app skeleton with login/register pages, JWT storage, auth context, protected routes, and responsive layout.
   - Autonomous: true
   - Requires human approval: false

11. Frontend Task Board & Detail
   - ID: frontend-task-board
   - Goal: Build Kanban board, task create/edit modal, task detail drawer with comments and activity timeline tabs, and filters by assignee/unassigned.
   - Autonomous: true
   - Requires human approval: false

12. Frontend Teams & Dashboards
   - ID: frontend-teams-dashboard
   - Goal: Build teams list, team detail with member management, workload view, and global/team dashboards.
   - Autonomous: true
   - Requires human approval: false

13. Testing & Quality Assurance
   - ID: testing-quality
   - Goal: Add backend unit/integration tests (JUnit, Testcontainers) and frontend component tests; verify acceptance criteria.
   - Autonomous: true
   - Requires human approval: false

14. Packaging & Delivery
   - ID: packaging-delivery
   - Goal: Produce build artifacts, Dockerfiles, env configuration, and README with run instructions for backend and frontend.
   - Autonomous: true
   - Requires human approval: false

## Runtime Gates Per Phase
- Stabilize generated app.
- Reconcile dependencies.
- Build.
- Test.
- Repair failures.
- Retry until pass or max retry limit.

## Final Gates
- Docker runtime convergence.
- Backend health success.
- Frontend HTTP success.
- Database health success.
- Redis health success.
- Final proof success.
