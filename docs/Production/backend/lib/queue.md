# lib/queue.ts - BullMQ Job Queues
Queues emails/notifications/ai over Redis when REDIS_URL exists; without Redis jobs run inline so features survive. Producers: queueEmail(type,data) for OTP/reset/order mail, queueNotification, queueAiJob. startWorkers() runs processors at boot. Connects: utils/mailer, notifications, ai routes.
