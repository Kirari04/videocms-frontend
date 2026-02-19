configure:
	@echo "Installing dependencies..."
	@bun i

dev:
	@echo "Starting development server..."
	@bun run dev -- --port 3001