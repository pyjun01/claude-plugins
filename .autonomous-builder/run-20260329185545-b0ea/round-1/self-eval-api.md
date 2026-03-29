# Self-Evaluation: API Server (Round 1)

## Endpoints Implemented

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| POST | /tasks | 201 | Creates task with title, optional priority |
| GET | /tasks | 200 | Lists tasks with filter & sort query params |
| GET | /tasks/stats | 200 | Returns total, active, completed counts |
| GET | /tasks/:id | 200 | Returns single task |
| PATCH | /tasks/:id/toggle | 200 | Toggles completed boolean |
| PATCH | /tasks/:id | 200 | Updates title and/or priority |
| DELETE | /tasks/completed | 204 | Bulk delete completed tasks |
| DELETE | /tasks/:id | 204 | Deletes single task |
| POST | /ai/summary | 200 | AI progress summary (requires ANTHROPIC_API_KEY) |

## Validation

- Empty/whitespace title → 400 "Title must not be empty"
- Title > 200 chars → 400 "Title must be 200 characters or fewer"
- Invalid priority → 400 "Priority must be one of: low, medium, high"
- Invalid UUID → 400 "Invalid task ID"
- Non-existent task → 404 "Task not found"

## API Design

- List response uses `{ items: [], meta: { total, activeCount, completedCount } }` wrapper
- Mutations return full updated task object
- Delete operations return 204 No Content
- CORS enabled
- In-memory storage (no database)

## What Works

- All CRUD operations verified via curl
- Filter by completion status (all/active/completed)
- Sort by createdAt (asc/desc)
- Title trimming on create/update
- Priority defaults to "medium"
- Route ordering: static routes before parameterized routes

## Known Limitations

- AI summary requires ANTHROPIC_API_KEY env var; endpoint returns 503 if not set
- No rate limiting
- No request logging (NestJS default logger only)

## Score Estimate

- **Product Depth**: 8/10 — Full CRUD with validation, filtering, sorting, stats, AI integration
- **Functionality**: 9/10 — All endpoints tested and working
- **Code Quality**: 8/10 — Clean NestJS structure, proper error handling
- **API Design**: 9/10 — Consistent schemas, proper status codes, validation
- **Security**: 7/10 — API key server-side only, input validation, no auth needed (single-user app)
