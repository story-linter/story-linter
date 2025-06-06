# Makefile for Story Linter Docker commands

.PHONY: help dev test build lint shell clean install

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies in Docker
	docker-compose run --rm dev npm install

dev: ## Start development mode with file watching
	docker-compose up dev

test: ## Run tests in Docker
	docker-compose run --rm test

build: ## Build all packages
	docker-compose run --rm build

lint: ## Lint a directory (use LINT_DIR=./path/to/files)
	docker-compose run --rm cli validate $${LINT_DIR:-.}

shell: ## Open a shell in the development container
	docker-compose run --rm dev /bin/bash

clean: ## Clean up Docker containers and volumes
	docker-compose down -v
	docker system prune -f

rebuild: ## Force rebuild Docker images
	docker-compose build --no-cache

# Development shortcuts
core-dev: ## Develop core package only
	docker-compose run --rm dev npm run dev --workspace=@story-linter/core

cli-dev: ## Develop CLI package only
	docker-compose run --rm dev npm run dev --workspace=@story-linter/cli

plugin-dev: ## Develop plugin-character package only
	docker-compose run --rm dev npm run dev --workspace=@story-linter/plugin-character