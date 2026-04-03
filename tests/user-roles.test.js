/**
 * @jest-environment jsdom
 */

describe("user-roles.js", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="userList"></div>
      <div id="emptyState"></div>
      <div id="rolePanel" class=""></div>
      <div id="selectedAvatar"></div>
      <div id="selectedName"></div>
      <div id="selectedEmail"></div>
      <div id="rolesGrid"></div>
      <input id="searchInput" value="">
      <div id="toast"></div>
    `;

    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, users: [], data: [] }),
      }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("ควรเรียก init() และดึงข้อมูลจาก API ได้", async () => {
    require("../js/user-roles.js");

    await new Promise(process.nextTick);
    expect(fetch).toHaveBeenCalledTimes(2); // ดึง users 1 ครั้ง, roles 1 ครั้ง
  });
});
