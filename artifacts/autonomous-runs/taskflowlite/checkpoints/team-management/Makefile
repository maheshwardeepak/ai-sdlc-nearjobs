SHELL := /bin/bash

.PHONY: help build up down logs ps restart clean test-backend test-frontend

help:
	@echo "TaskFlowLite - common targets"
	@echo "  make build           Build all docker images"
	@echo "  make up              Start full stack (db + backend + frontend)"
	@echo "  make down            Stop and remove containers"
	@echo "  make logs            Tail logs for all services"
	@echo "  make ps              Show service status"
	@echo "  make restart         Restart all services"
	@echo "  make clean           Remove containers, networks, and volumes"
	@echo "  make test-backend    Run backend tests"
	@echo "  make test-frontend   Run frontend tests"

build:
	docker compose build

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

ps:
	docker compose ps

restart:
	docker compose restart

clean:
	docker compose down -v --remove-orphans

test-backend:
	cd backend && ./mvnw -B test

test-frontend:
	cd frontend && pnpm test --run