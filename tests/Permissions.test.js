/**
 * @jest-environment jsdom
 */

describe("Permissions.js", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="rolesList"></div>
      <div id="menuGrid"></div>
      <h2 id="permissionTitle"></h2>
      <div id="emptyState" class=""></div>
      <div id="permissionsContent" class="hidden"></div>
      
      <div id="roleModal" class=""></div>
      <h2 id="modalTitle"></h2>
      <input id="roleNameInput" value="">
      <div id="deleteModal" class=""></div>
      <p id="deleteMessage"></p>
      
      <div id="toast"></div>
      <input class="search-input" value="">
    `;

    // จำลอง fetch ที่คืนค่า header แบบ JSON (เพราะในโค้ดมีการเช็ค headers)
    global.fetch = jest.fn(() =>
      Promise.resolve({
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ success: true, data: [] }),
      }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("ควรโหลด Roles และ Permissions เมื่อเปิดหน้าเว็บ", async () => {
    require("../js/Permissions.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    // รอให้ Promise.all ในโค้ดทำงานเสร็จ
    await new Promise(process.nextTick);

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("get_roles"));
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("get_permissions"),
    );
  });
});
