# Architecture Plan: TaskFlowLite

## Layers
- Frontend UI
- Backend API
- Database persistence
- Runtime health endpoints
- Docker compose runtime

## Runtime Contract
- Backend binds to port 3000
- Frontend binds through generated Docker runtime
- Backend exposes /health
- Database and Redis are reachable inside Docker network
