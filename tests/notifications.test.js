/**
 * @jest-environment jsdom
 */

describe("notifications.js", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="notificationList"></div>
      <span id="unreadCount"></span>
    `;

    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({ success: true, data: [], unread_count: 0 }),
      }),
    );

    // จำลองเวลาไม่ให้ setInterval ทำงานวนลูปไม่รู้จบตอนเทสต์
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.useRealTimers();
  });

  test("ควรโหลด Notifications เมื่อเปิดหน้าเว็บ", () => {
    require("../js/notifications.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(fetch).toHaveBeenCalled();
  });
});
