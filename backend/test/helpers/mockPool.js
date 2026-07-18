const mockPool = {
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn(),
    release: jest.fn(),
  }),
  end: jest.fn().mockResolvedValue(undefined),
  totalCount: 0,
  idleCount: 0,
  waitingCount: 0,
};
module.exports = mockPool;
