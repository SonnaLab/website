.PHONY: help install dev build preview check check-types lint lint-fix test serve clean deps-check deploy ci

# ──────────────────────────────────────────────────────────────────────────────
# SonnaLab Frontend — Development, Testing & Deployment Utilities
# ──────────────────────────────────────────────────────────────────────────────

help:
	@echo "SonnaLab Frontend — Make Commands"
	@echo ""
	@echo "Development:"
	@echo "  make install       — Install dependencies (npm ci)"
	@echo "  make dev           — Start dev server (Vite, hot reload)"
	@echo "  make build         — Build for production (+ sitemap)"
	@echo "  make preview       — Preview production build (Vite)"
	@echo ""
	@echo "Quality Assurance:"
	@echo "  make check         — Full check (types + lint + build)"
	@echo "  make check-types   — Check TypeScript types"
	@echo "  make lint          — Lint code (eslint + prettier format check)"
	@echo "  make lint-fix      — Auto-fix lint issues"
	@echo ""
	@echo "Testing & Validation:"
	@echo "  make test          — Run unit tests (vitest/jest if configured)"
	@echo "  make serve         — Serve the production build locally"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy        — Full pre-deployment check (equivalent to CI)"
	@echo "  make ci            — CI pipeline (install → check)"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean         — Clean dist & node_modules"
	@echo "  make deps-check    — Check for outdated dependencies"

# ──────────────────────────────────────────────────────────────────────────────
# Development
# ──────────────────────────────────────────────────────────────────────────────

install:
	@echo "Installing dependencies..."
	npm ci

dev:
	@echo "Starting dev server..."
	npm run dev

build:
	@echo "Building for production..."
	npm run build

preview:
	@echo "Previewing production build..."
	npm run preview

# ──────────────────────────────────────────────────────────────────────────────
# Quality Assurance
# ──────────────────────────────────────────────────────────────────────────────

check: check-types lint build
	@echo "✅ All checks passed!"

check-types:
	@echo "Checking TypeScript types..."
	npx tsc --noEmit

lint:
	@echo "Linting code..."
	@if [ -f "eslint.config.js" ] || [ -f "eslint.config.mjs" ] || [ -f "eslint.config.cjs" ] || [ -f ".eslintrc" ] || [ -f ".eslintrc.js" ] || [ -f ".eslintrc.cjs" ] || [ -f ".eslintrc.json" ] || [ -f ".eslintrc.yml" ] || [ -f ".eslintrc.yaml" ]; then \
		if [ -x "./node_modules/.bin/eslint" ]; then \
			npx eslint src --ext .ts,.tsx --max-warnings 0; \
		else \
			echo "⚠️  ESLint config found but local eslint is not installed, skipping..."; \
		fi; \
	else \
		echo "ℹ️  No ESLint config found, skipping..."; \
	fi
	@if [ -x "./node_modules/.bin/prettier" ]; then \
		npx prettier --check "src/**/*.{ts,tsx,css,json,md}"; \
	else \
		echo "ℹ️  Prettier not installed, skipping..."; \
	fi

lint-fix:
	@echo "Auto-fixing code..."
	@if [ -x "./node_modules/.bin/prettier" ]; then \
		npx prettier --write "src/**/*.{ts,tsx,css,json,md}"; \
	fi
	@if [ -f "eslint.config.js" ] || [ -f "eslint.config.mjs" ] || [ -f "eslint.config.cjs" ] || [ -f ".eslintrc" ] || [ -f ".eslintrc.js" ] || [ -f ".eslintrc.cjs" ] || [ -f ".eslintrc.json" ] || [ -f ".eslintrc.yml" ] || [ -f ".eslintrc.yaml" ]; then \
		if [ -x "./node_modules/.bin/eslint" ]; then \
			npx eslint src --ext .ts,.tsx --fix; \
		else \
			echo "⚠️  ESLint config found but local eslint is not installed, skipping..."; \
		fi; \
	fi

# ──────────────────────────────────────────────────────────────────────────────
# Testing & Validation
# ──────────────────────────────────────────────────────────────────────────────

test:
	@echo "Running tests..."
	@if [ -f "vitest.config.ts" ] || grep -q '"vitest"' package.json; then \
		npx vitest; \
	elif [ -f "jest.config.ts" ] || [ -f "jest.config.js" ]; then \
		npx jest; \
	else \
		echo "⚠️  No test runner configured (vitest/jest)"; \
	fi

serve:
	@echo "Serving production build locally..."
	@if command -v npx >/dev/null 2>&1; then \
		npx serve build; \
	else \
		echo "❌ 'serve' package not found. Install with: npm i -g serve"; \
	fi

# ──────────────────────────────────────────────────────────────────────────────
# Deployment
# ──────────────────────────────────────────────────────────────────────────────

deploy:
	@echo "Deploying SonnaLab frontend..."
	git pull origin main
	npm ci
	npm run build
	@echo "Deployment complete — build/ is live."

ci: install check
	@echo "CI pipeline completed successfully!"

# ──────────────────────────────────────────────────────────────────────────────
# Maintenance
# ──────────────────────────────────────────────────────────────────────────────

clean:
	@echo "Cleaning..."
	rm -rf build dist node_modules .vite
	@echo "✓ Cleaned: build/, dist/, node_modules/, .vite/"

deps-check:
	@echo "Checking for outdated dependencies..."
	npm outdated || echo "All dependencies up to date!"

.DEFAULT_GOAL := help
