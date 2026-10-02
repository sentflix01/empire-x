const { AsyncLocalStorage } = require('node:async_hooks');
const databaseContext = new AsyncLocalStorage();

const mockPool = {
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  }),
  end: jest.fn().mockResolvedValue(undefined),
  totalCount: 0,
  idleCount: 0,
  waitingCount: 0,
  getCurrentDatabaseEnvironment: () => databaseContext.getStore()?.environment ?? 'real',
  getCurrentDatabaseContext: () => databaseContext.getStore() ?? ({ environment: 'real' }),
  runWithDatabaseEnvironment: (context, callback) => databaseContext.run(context, callback),
  closeAllPools: jest.fn().mockResolvedValue(undefined),
};
module.exports = mockPool;
