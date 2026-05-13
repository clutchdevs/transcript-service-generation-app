# AGENTS.md

## Project Context
This is an Angular transcript dashboard for creating, listing, editing, and monitoring transcription jobs.

## Angular Guidance
For Angular-specific implementation guidance, use the `angular-developer` skill if available.
For creating brand-new Angular applications, use the `angular-new-app` skill if available.

Follow the existing Angular patterns in this repository:
- Standalone components.
- Signals and computed state.
- Services for API and state coordination.
- Shared UI components before adding new UI primitives.

## UI Rules
- In feature templates, prefer `app-button` instead of native `<button>`.
- Preserve the existing dashboard visual language and component structure.

## Realtime And Jobs
- Realtime uses Centrifugo.
- WebSocket URL: `wss://realtime.transcriptor.space/connection/websocket`.
- User channel format: `user#<userId>`.
- Token endpoint: `POST /api/realtime/token`.
- The job list uses safety-net polling for pending jobs, even when Centrifugo connects, because production can connect and subscribe without receiving publications.
- Expected realtime publications include `transcription.completed`, `transcription.failed`, `job.updated`, `job.deleted`, and `job.canceled`.

## Backend Contracts
Current frontend integrations include:
- `POST /api/transcription/create-job`
- `GET /api/transcription/{userId}/jobs`
- `GET /api/transcription/jobs/{jobId}`
- `GET /api/transcription/jobs/{referenceId}/transcript`
- `DELETE /api/transcription/jobs/{jobId}`
- `PATCH /api/transcription/jobs/{jobId}`
- `POST /api/transcription/jobs/{jobId}/cancel`

## Editor
- Edited transcripts are currently persisted locally.
- Do not add backend persistence unless the backend endpoint exists or the user explicitly asks.

## Verification
- Run `npm test` when behavior changes.
- Run `npm run build` after Angular changes.
