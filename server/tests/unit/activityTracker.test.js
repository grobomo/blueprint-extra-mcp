/**
 * ActivityTracker unit tests with mock transport
 * Spec 011 T003
 */

const { ActivityTracker } = require('../../src/activityTracker');

function createMockTransport(responses = {}) {
  let cdpCallCount = 0;
  // stop() now calls: getConsoleMessages, then forwardCDPCommand (stop script),
  // then forwardCDPCommand (iframe collection)
  return {
    sendCommand: jest.fn().mockImplementation((command) => {
      if (command === 'getConsoleMessages') {
        // Return console messages (for cross-navigation event recovery)
        return Promise.resolve({ messages: responses.consoleMessages || [] });
      }
      // forwardCDPCommand calls
      cdpCallCount++;
      if (cdpCallCount <= 2) {
        // start() calls — inject tracker script
        return Promise.resolve({ result: { value: 'activity_tracker_started' } });
      } else if (cdpCallCount === 3) {
        // stop() call 1 — stop script returns events from current page
        return Promise.resolve({
          result: { value: JSON.stringify(responses.stopResult || { events: [], count: 0 }) }
        });
      } else {
        // stop() call 2 — iframe event collection
        return Promise.resolve({
          result: { value: JSON.stringify(responses.iframeEvents || []) }
        });
      }
    })
  };
}

describe('ActivityTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new ActivityTracker();
  });

  test('starts in idle state', () => {
    expect(tracker.isRecording).toBe(false);
  });

  test('start() sets recording state and injects script', async () => {
    const transport = createMockTransport();
    const result = await tracker.start(transport);

    expect(result.success).toBe(true);
    expect(tracker.isRecording).toBe(true);
    // Should have called sendCommand at least twice (main + iframe injection)
    expect(transport.sendCommand).toHaveBeenCalledTimes(2);
    expect(transport.sendCommand).toHaveBeenCalledWith(
      'forwardCDPCommand',
      expect.objectContaining({
        method: 'Runtime.evaluate'
      })
    );
  });

  test('start() fails if already recording', async () => {
    const transport = createMockTransport();
    await tracker.start(transport);

    const result = await tracker.start(transport);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Already recording');
  });

  test('stop() collects events and returns summary', async () => {
    const events = [
      { type: 'click', timestamp: '2026-01-01T00:00:01Z', element: { tag: 'BUTTON', text: 'Save' } },
      { type: 'click', timestamp: '2026-01-01T00:00:02Z', element: { tag: 'BUTTON', text: 'Save' } },
      { type: 'hover', timestamp: '2026-01-01T00:00:03Z', element: { tag: 'A', text: 'Link' }, durationMs: 800 },
      { type: 'page_dwell', timestamp: '2026-01-01T00:00:00Z', dwellMs: 5000, maxScrollPct: 75, url: 'https://example.com/page1' },
      { type: 'navigation', timestamp: '2026-01-01T00:00:04Z', from: '/page1', to: '/page2', method: 'hashchange' },
      { type: 'scroll_depth', timestamp: '2026-01-01T00:00:05Z', scrollPct: 80, url: 'https://example.com/page1' }
    ];

    const transport = createMockTransport({ stopResult: { events, count: events.length } });
    await tracker.start(transport);
    const result = await tracker.stop(transport);

    expect(result.success).toBe(true);
    expect(result.eventCount).toBe(6);
    expect(result.summary.clicks).toBe(2);
    expect(result.summary.hovers).toBe(1);
    expect(result.summary.pageVisits).toBe(1);
    expect(result.summary.navigations).toBe(1);
    expect(result.summary.scrollEvents).toBe(1);
    expect(result.summary.totalEvents).toBe(6);
  });

  test('stop() fails if not recording', async () => {
    const transport = createMockTransport();
    const result = await tracker.stop(transport);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Not recording');
  });

  test('stop() merges iframe events', async () => {
    const mainEvents = [
      { type: 'click', timestamp: '2026-01-01T00:00:01Z', element: { tag: 'BUTTON', text: 'Main' } }
    ];
    const iframeEvents = [
      { type: 'click', timestamp: '2026-01-01T00:00:02Z', element: { tag: 'A', text: 'Iframe' }, iframe: 'content-frame' }
    ];

    const transport = createMockTransport({
      stopResult: { events: mainEvents, count: 1 },
      iframeEvents
    });

    await tracker.start(transport);
    const result = await tracker.stop(transport);

    expect(result.success).toBe(true);
    expect(result.eventCount).toBe(2);
    // Events sorted by timestamp
    expect(result.events[0].element.text).toBe('Main');
    expect(result.events[1].element.text).toBe('Iframe');
    expect(result.events[1].iframe).toBe('content-frame');
  });

  test('start() resets state on transport failure', async () => {
    const transport = {
      sendCommand: jest.fn().mockRejectedValue(new Error('Connection lost'))
    };

    const result = await tracker.start(transport);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Connection lost');
    expect(tracker.isRecording).toBe(false);
  });

  test('stop() recovers events from console messages after page navigation', async () => {
    // Simulate: tracker ran on page A, page navigated to B, tracker lost on page.
    // Events from page A are in console buffer via __BP_ACTIVITY__ prefix.
    const consoleMessages = [
      { text: '__BP_ACTIVITY__{"type":"click","timestamp":"2026-01-01T00:00:01Z","element":{"tag":"A","text":"Link1"},"url":"https://v1.com/page1"}', level: 'log' },
      { text: '__BP_ACTIVITY__{"type":"scroll_depth","timestamp":"2026-01-01T00:00:02Z","scrollPct":60,"url":"https://v1.com/page1"}', level: 'log' },
      { text: 'some other console message', level: 'log' },
      { text: '__BP_ACTIVITY__{"type":"page_dwell","timestamp":"2026-01-01T00:00:00Z","dwellMs":5000,"maxScrollPct":60,"url":"https://v1.com/page1","reason":"unload"}', level: 'log' }
    ];

    // Page has navigated — stop script returns empty (tracker not on new page)
    const transport = createMockTransport({
      consoleMessages,
      stopResult: { events: [], error: 'not_active' }
    });

    await tracker.start(transport);
    const result = await tracker.stop(transport);

    expect(result.success).toBe(true);
    expect(result.eventCount).toBe(3); // 3 __BP_ACTIVITY__ messages, 1 ignored
    expect(result.events[0].type).toBe('page_dwell'); // sorted by timestamp
    expect(result.events[1].type).toBe('click');
    expect(result.events[2].type).toBe('scroll_depth');
  });

  test('stop() deduplicates events from console and page sources', async () => {
    // Same events in both console buffer and page __bpActivity
    const event = { type: 'click', timestamp: '2026-01-01T00:00:01Z', element: { tag: 'BUTTON', text: 'Save' } };
    const consoleMessages = [
      { text: '__BP_ACTIVITY__' + JSON.stringify(event), level: 'log' }
    ];

    const transport = createMockTransport({
      consoleMessages,
      stopResult: { events: [event], count: 1 }
    });

    await tracker.start(transport);
    const result = await tracker.stop(transport);

    expect(result.success).toBe(true);
    expect(result.eventCount).toBe(1); // Deduped — not 2
    expect(result.events[0].type).toBe('click');
  });

  test('topPages aggregation works correctly', async () => {
    const events = [
      { type: 'page_dwell', timestamp: '2026-01-01T00:00:00Z', dwellMs: 3000, maxScrollPct: 50, url: 'https://v1.com/page1' },
      { type: 'page_dwell', timestamp: '2026-01-01T00:01:00Z', dwellMs: 7000, maxScrollPct: 90, url: 'https://v1.com/page1' },
      { type: 'page_dwell', timestamp: '2026-01-01T00:02:00Z', dwellMs: 2000, maxScrollPct: 30, url: 'https://v1.com/page2' }
    ];

    const transport = createMockTransport({ stopResult: { events, count: events.length } });
    await tracker.start(transport);
    const result = await tracker.stop(transport);

    expect(result.summary.topPages).toHaveLength(2);
    // page1 should be first (10000ms total)
    expect(result.summary.topPages[0].url).toBe('https://v1.com/page1');
    expect(result.summary.topPages[0].totalMs).toBe(10000);
    expect(result.summary.topPages[0].visits).toBe(2);
    expect(result.summary.topPages[0].maxScrollPct).toBe(90);
  });
});
