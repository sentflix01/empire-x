const LOCAL_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres']);

function databaseTarget(connectionString) {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const url = new URL(connectionString);
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return {
    name: decodeURIComponent(url.pathname.replace(/^\//, '')),
    host,
    port: url.port || '5432',
  };
}

function assertSafeTarget({ target, nodeEnv, acknowledgement, acknowledgementName }) {
  if (nodeEnv === 'production') throw new Error('This local development operation is disabled in production');
  if (!LOCAL_DATABASE_HOSTS.has(target.host)) {
    throw new Error(`Refusing a non-local database target (${target.host}); this tool only operates on local development databases`);
  }
  if (acknowledgement !== '1') {
    throw new Error(`Set ${acknowledgementName}=1 to confirm this local development operation`);
  }
  return target;
}

function assertSafeLocalDatabase(options) {
  return assertSafeTarget({ ...options, target: databaseTarget(options.connectionString) });
}

function assertSafeDevSeed(env = process.env) {
  return assertSafeLocalDatabase({
    connectionString: env.DATABASE_URL,
    nodeEnv: env.NODE_ENV,
    acknowledgement: env.ALLOW_DEV_SEED,
    acknowledgementName: 'ALLOW_DEV_SEED',
  });
}

module.exports = { LOCAL_DATABASE_HOSTS, databaseTarget, assertSafeTarget, assertSafeLocalDatabase, assertSafeDevSeed };
