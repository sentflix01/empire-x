jest.mock('../../db/pool', () => require('./mockPool'));
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-production';
process.env.NODE_ENV = 'test';
