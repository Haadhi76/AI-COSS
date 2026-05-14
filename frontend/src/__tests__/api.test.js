import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  global.fetch = vi.fn();
});

describe('api.getTodayBriefing', () => {
  it('POSTs messages to /api/briefing/today and returns the row', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, briefing_date: '2026-05-14', completed_ids: [] }),
    });

    const { getTodayBriefing } = await import('../lib/api.js');
    const result = await getTodayBriefing([{ id: 1 }]);

    const call = global.fetch.mock.calls[0];
    expect(call[0]).toContain('/api/briefing/today');
    expect(call[0]).not.toContain('force=true');
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({ messages: [{ id: 1 }] });
    expect(result.id).toBe(1);
  });

  it('appends ?force=true when force option is set', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1 }),
    });

    const { getTodayBriefing } = await import('../lib/api.js');
    await getTodayBriefing([{ id: 1 }], { force: true });

    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('/api/briefing/today?force=true');
  });
});
