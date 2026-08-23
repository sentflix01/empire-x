# lib/queue.ts - BullMQ Job Queues

## 1. What is this?

**Shared frontend library.** Queues emails/notifications/ai over Redis when REDIS_URL exists; without Redis jobs run inline so features survive.

## 2. Why does it exist?

Queues emails/notifications/ai over Redis when REDIS_URL exists; without Redis jobs run inline so features survive. Producers: queueEmail(type,data) for OTP/reset/order mail, queueNotification, queueAiJob. startWorkers() runs processors at boot. Connects: utils/mailer, notifications, ai routes.

## 3. What does it do?

Queues emails/notifications/ai over Redis when REDIS_URL exists; without Redis jobs run inline so features survive. Producers: queueEmail(type,data) for OTP/reset/order mail, queueNotification, queueAiJob. startWorkers() runs processors at boot. Connects: utils/mailer, notifications, ai routes.

## 4. What does it touch?

Inline references only — nothing external.
