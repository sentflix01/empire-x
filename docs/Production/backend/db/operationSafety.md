# Database operation safety helpers

`operationSafety.js` extracts a database host, port, and name without retaining
or logging connection credentials. Destructive seed cleanup, account bootstrap,
and demo seeding require a non-production environment and a local database
host (`localhost`, loopback, or the local Docker service host `postgres`).
Each command has its own explicit acknowledgement variable and rejects hosted
database targets before it opens a pool connection.

The helper is a defense in depth layer. Keep provider-side backups, access
controls, and deployment procedures in place; do not point local data scripts
at production databases.
