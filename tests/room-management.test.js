/**
 * @jest-environment jsdom
 */

describe("room-management.js", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="roomForm"></form>
      <table>
          <tbody id="roomTableBody"></tbody>
      </table>
      <input id="searchInput" value="">
      <div id="loadingOverlay"></div>
      <div id="toast"></div>
      <h2 id="formTitle"></h2>
      <button id="submitBtn"></button>
      <button id="cancelBtn"></button>
      <input type="file" id="imageFile">
      <div id="imagePreview"></div>
      
      <input id="roomId" value="">
      <input id="roomName" value="">
      <input id="capacity" value="10">
      <input id="roomSize" value="20">
      <input id="floorNumber" value="1">
      <select id="status"></select>
      <input id="openTime" value="08:00">
      <input id="closeTime" value="17:00">
      <textarea id="description"></textarea>

      <div id="altRoomModal"></div>
      <div id="altRoomList"></div>
      <button id="confirmMoveBtn"></button>
    `;

    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, data: [] }),
      }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("ควรเริ่มต้นระบบ และโหลดข้อมูลสถานะ/ห้องประชุมได้", () => {
    require("../js/room-management.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(fetch).toHaveBeenCalledTimes(2); // โหลด Status และ โหลด Rooms
  });

  test("showToast ควรแสดงข้อความและอัปเดต DOM ได้", () => {
    const { showToast } = require("../js/room-management.js");
    if (showToast) {
      showToast("บันทึกสำเร็จ", "success");
      expect(document.getElementById("toast").textContent).toBe("บันทึกสำเร็จ");
      expect(document.getElementById("toast").className).toContain("show");
    }
  });
});
