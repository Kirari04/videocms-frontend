dev:
	@bun run dev -- --port 3001

publish:
	docker build --platform linux/amd64 -t kirari04/videocms:panel --push .