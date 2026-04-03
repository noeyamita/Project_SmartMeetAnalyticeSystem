/**
 * @jest-environment jsdom
 */

describe("sidebar.js", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="menuTitle"></div>
      <div class="nav-item" data-page="dashboard" data-roles="Admin"></div>
      <div class="nav-item" data-page="notifications"></div>
      <div class="nav-item" data-page="room_requests"></div>
    `;

    //จำลอง sessionStorage
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === "userRole") return "Admin";
      if (key === "roleId") return "1";
      return null;
    });
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            success: true,
            status: "success",
            data: { permissions: [] },
            unread_count: 0,
            count: 0,
          }),
      }),
    );
    global.setInterval = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("ควรเช็คสิทธิ์และโหลด Badge ได้เมื่อโหลดหน้า", async () => {
    require("../js/sidebar.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    // เผื่อเวลาให้ Promise ของ fetch ทำงานจนเสร็จ
    await new Promise((resolve) => setTimeout(resolve, 0));

    // ตรวจสอบว่ามีการเรียก fetch เพื่อเช็คสิทธิ์และโหลด Badge
    expect(fetch).toHaveBeenCalled();
  });
});
