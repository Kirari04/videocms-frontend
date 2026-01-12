configure:
	@echo "Installing dependencies..."
	@bun i

dev:
	@echo "Starting development server..."
	@bun run dev -- --port 3001

publish:
	docker build --platform linux/amd64 -t kirari04/videocms:panel --push .