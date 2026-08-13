# Email Worker (sdd-finanzas)

This small service accepts enqueued email requests from the client and sends them via SMTP. It's a minimal example to run locally or in a container.

Endpoints
- POST /enqueue-email  - Accepts JSON { to, subject, text, html, attachments, _maxRetries? }
  - Returns 202 when accepted.
- GET /health - health check

Environment
- SMTP_HOST (required to send)
- SMTP_PORT (default 587)
- SMTP_SECURE (true/false)
- SMTP_USER, SMTP_PASS (optional if SMTP server allows unauthenticated)
- FROM_ADDRESS (optional override)
- PORT (default 3000)
- WORKER_INTERVAL_MS (ms between attempts, default 5000)

Running locally
1. cd server
2. npm install
3. SMTP env vars must be set, then:
   npm start

Docker
- Build: docker build -t sdd-finanzas-email-worker .
- Run: docker run -e SMTP_HOST=... -e SMTP_PORT=587 -p 3000:3000 sdd-finanzas-email-worker

Notes
- This uses a local JSON file (email_queue.json) as a queue for simplicity. For production use, replace with a durable queue (Redis/SQS/DB) and secure credentials.
- The client currently queues email_requests in IndexedDB; to use this worker, modify the client to POST queued requests to /enqueue-email (or implement a sync endpoint that pulls queued requests from clients).
