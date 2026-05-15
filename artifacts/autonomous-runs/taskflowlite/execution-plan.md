# Execution Plan: TaskFlowLite

## Approval Model
- Human approval is required once before autonomous execution.
- After approval, all phases run automatically.
- Failed build/test/runtime checks are repaired by the factory and retried automatically.
- No additional approval is required between phases unless the project plan changes.

## Autonomous Phases
1. Plan Review & Approval
   - ID: planning-approval
   - Goal: Present full execution plan for one-time human approval before autonomous execution.
   - Autonomous: false
   - Requires human approval: true

2. Project Scaffolding & Tooling
   - ID: project-scaffolding
   - Goal: Initialize Spring Boot Maven backend, Vite React TypeScript frontend with pnpm, PostgreSQL config, and shared lint/format tooling.
   - Autonomous: true
   - Requires human approval: false

3. Database Schema & JPA Entities
   - ID: database-and-entities
   - Goal: Define PostgreSQL schema and JPA entities for User, Team, TeamMember, Task, Comment, ActivityLog with migrations.
   - Autonomous: true
   - Requires human approval: false

4. Backend Health Endpoint
   - ID: health-endpoint
   - Goal: Implement /api/health endpoint and basic actuator configuration.
   - Autonomous: true
   - Requires human approval: false

5. Authentication & JWT Security
   - ID: auth-security-jwt
   - Goal: Implement registration, login, password hashing (BCrypt), JWT issuance/validation, and Spring Security filter chain protecting APIs.
   - Autonomous: true
   - Requires human approval: false

6. RBAC & User Profile
   - ID: rbac-and-profile
   - Goal: Implement ADMIN/MANAGER/MEMBER roles, method-level authorization, and authenticated /users/me profile endpoint.
   - Autonomous: true
   - Requires human approval: false

7. Team Management & Membership
   - ID: team-management
   - Goal: Implement team CRUD, member invitation/addition/removal, and team membership authorization.
   - Autonomous: true
   - Requires human approval: false

8. Task CRUD & Statuses
   - ID: task-crud
   - Goal: Implement task create/read/update/delete with title, description, priority, due date, and TODO/IN_PROGRESS/DONE statuses protected by auth.
   - Autonomous: true
   - Requires human approval: false

9. Task Assignment, Reassignment & Workload
   - ID: task-assignment-workload
   - Goal: Enable assigning/reassigning tasks to team members, filtering by assignee, unassigned tasks view, and workload metrics endpoint.
   - Autonomous: true
   - Requires human approval: false

10. Task Comments
   - ID: comments
   - Goal: Implement comment creation, listing, edit/delete by author, with author and timestamp metadata.
   - Autonomous: true
   - Requires human approval: false

11. Activity Audit Log
   - ID: activity-audit-log
   - Goal: Capture and expose activity events for task creation, status, priority, due date, assignee changes, and comment create/delete.
   - Autonomous: true
   - Requires human approval: false

12. Dashboard & Analytics APIs
   - ID: dashboard-analytics
   - Goal: Provide global and team-level dashboards with task counts by status and aggregates.
   - Autonomous: true
   - Requires human approval: false

13. Frontend Auth Shell & Routing
   - ID: frontend-auth-shell
   - Goal: Build login/register screens, JWT storage, axios interceptors, protected routes, and global layout.
   - Autonomous: true
   - Requires human approval: false

14. Frontend Task Board & Detail
   - ID: frontend-task-board
   - Goal: Implement responsive task board, create/edit modal, task detail drawer with comments and activity timeline, filters by assignee and unassigned.
   - Autonomous: true
   - Requires human approval: false

15. Frontend Teams, Workload & Dashboard
   - ID: frontend-teams-dashboard
   - Goal: Implement teams list, team detail with member management and workload, global dashboard, and profile screen.
   - Autonomous: true
   - Requires human approval: false

16. Automated Testing
   - ID: testing-qa
   - Goal: Add backend unit/integration tests (JUnit, Spring Boot Test) and frontend tests (Vitest/RTL) covering auth, RBAC, tasks, comments, audit.
   - Autonomous: true
   - Requires human approval: false

17. Packaging, Docker & Deployment Readiness
   - ID: packaging-deployment
   - Goal: Containerize backend and frontend, provide docker-compose with PostgreSQL, environment configs, and README runbook.
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
