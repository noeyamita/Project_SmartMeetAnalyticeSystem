/**
 * @jest-environment jsdom
 */

describe("banned_users.js", () => {
  // 1. สร้างหน้าเว็บจำลอง "ก่อน" รันแต่ละเทสต์
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="searchInput" value="">
      <button id="clearBtn" style="display: none;"></button>
      <table id="userTable">
         <tbody id="userTableBody"></tbody>
      </table>
      <div id="resultCount"></div>
      <div id="statBanned"></div>
      <div id="statActive"></div>
      
      <div id="modalOverlay"></div>
      <div id="modalIcon"></div>
      <div id="modalTitle"></div>
      <div id="modalDesc"></div>
      <div id="modalReasonWrap"></div>
      <button id="modalConfirmBtn"></button>
      <input id="banReason" value="">
      
      <div id="toast"></div>
    `;

    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, users: [] }),
      }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules(); //  เคลียร์แคช
  });

  test("showToast should update DOM", () => {
    // 2. เรียกไฟล์ JS เข้ามา "ข้างใน" test
    const { showToast } = require("../js/banned_users.js");
  });
});
