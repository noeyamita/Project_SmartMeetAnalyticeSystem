/**
 * @jest-environment jsdom
 */

describe("room-requests.js", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="requestsContainer"></div>
      
      <div id="altRoomModal" class=""></div>
      <div id="altRoomList"></div>
      <button id="confirmMoveBtn"></button>
    `;

    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ status: "success", data: [] }),
      }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("ควรโหลด requests เมื่อเปิดหน้าเว็บ", async () => {
    require("../js/room-requests.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    await new Promise(process.nextTick);
    expect(fetch).toHaveBeenCalled();
  });
});
