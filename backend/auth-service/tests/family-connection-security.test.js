jest.mock('../src/config/db', () => ({ query: jest.fn() }));

const pool = require('../src/config/db');
const familyController = require('../src/controllers/family.controller');

function response() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('family connection deletion authorization', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes a connection only when the current user is one of its participants', async () => {
    pool.query.mockResolvedValue({
      rowCount: 1,
      rows: [{
        id: '11111111-1111-4111-8111-111111111111',
        requester_id: '22222222-2222-4222-8222-222222222222',
        requested_id: '33333333-3333-4333-8333-333333333333',
        status: 'accepted',
      }],
    });
    const req = {
      params: { id: '11111111-1111-4111-8111-111111111111' },
      user: { id: '22222222-2222-4222-8222-222222222222' },
    };
    const res = response();
    const next = jest.fn();

    await familyController.deleteConnection(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('(requester_id = $2 OR requested_id = $2)'),
      [req.params.id, req.user.id],
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('does not reveal or delete a connection owned by other users', async () => {
    pool.query.mockResolvedValue({ rowCount: 0, rows: [] });
    const req = {
      params: { id: '11111111-1111-4111-8111-111111111111' },
      user: { id: '44444444-4444-4444-8444-444444444444' },
    };
    const res = response();

    await familyController.deleteConnection(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
