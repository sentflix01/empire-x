# Deprecated account reset command

`fix-dev-accounts.js` is retained only as a compatibility entry point. It
always refuses to run because its previous behavior reset known passwords and
could promote an existing account to admin. For a fresh local database only,
use the guarded `create-admin.js` bootstrap. Use a provider-controlled secure
recovery procedure for hosted accounts.
