# Product Plan: TaskFlowLite

## Source Requirements
DISCOVERED REQUIREMENT FILES:
- product.md

# Source: product.md

# TaskFlowLite Requirements

Build a lightweight task workflow app for small teams.

## Core features
- Create, edit, delete tasks
- Task statuses: TODO, IN_PROGRESS, DONE
- Task title, description, priority, due date
- Dashboard showing task counts by status
- Simple responsive UI
- Backend health endpoint
- PostgreSQL persistence

## Authentication and security
- JWT-based login and registration
- Password hashing
- Protected backend APIs
- Authenticated user profile endpoint
- Role-based access control: ADMIN, MANAGER, MEMBER
- Only logged-in users can create, update, comment, or assign tasks

## Team collaboration
- Create teams and invite/add members
- Assign tasks to team members
- Reassign tasks between members
- View member workload
- Filter board by assignee
- Show unassigned tasks
- Team-level dashboard

## Task comments
- Add comments on tasks
- Edit/delete own comments
- Show comment author and timestamp
- Display comments in task detail modal/drawer

## Activity audit logs
- Log task creation
- Log status changes
- Log priority changes
- Log due date changes
- Log assignee changes
- Log comment creation/deletion
- Show activity timeline inside task detail view


## Confirmed Stack
- Backend: Java / Spring Boot
- Frontend: TypeScript / React
- Database: PostgreSQL

## Product Summary
TaskFlowLite is a lightweight team task workflow application enabling small teams to manage tasks across TODO/IN_PROGRESS/DONE statuses with JWT-secured authentication, role-based access (ADMIN/MANAGER/MEMBER), team collaboration, task assignment, threaded comments, and full activity audit logging. Built on Spring Boot + PostgreSQL backend with a React + TypeScript (Vite) frontend.

## Domain Modules
- Authentication & Security
- User & Profile Management
- Role-Based Access Control
- Team Management & Collaboration
- Task Management
- Task Assignment & Workload
- Task Comments
- Activity Audit Logging
- Dashboard & Reporting
- System Health & Observability

## Product Scope
- Generate a production-ready full-stack application from the supplied requirements.
- Preserve the requested domain behavior and business rules.
- Use autonomous stabilization, dependency reconciliation, Docker runtime verification, and health validation.
