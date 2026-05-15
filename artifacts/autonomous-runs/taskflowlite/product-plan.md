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
TaskFlowLite is a lightweight task workflow application for small teams built with Spring Boot (Java/Maven) backend, React+TypeScript (Vite/pnpm) frontend, and PostgreSQL persistence. It supports task CRUD with statuses/priorities/due dates, JWT authentication with RBAC (ADMIN, MANAGER, MEMBER), team collaboration with task assignment, threaded comments, activity audit logs, and dashboards showing task counts and workload.

## Domain Modules
- Authentication & Security
- User Profile & RBAC
- Team Management
- Task Management
- Task Assignment & Workload
- Comments
- Activity Audit Log
- Dashboard & Analytics
- Health & Observability

## Product Scope
- Generate a production-ready full-stack application from the supplied requirements.
- Preserve the requested domain behavior and business rules.
- Use autonomous stabilization, dependency reconciliation, Docker runtime verification, and health validation.
