/**
 * @jest-environment jsdom
 */

describe("BookingMeetingRoom.js", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="alertBox"></div>
      <input id="date" value="">
      <input id="start_time" value="">
      <input id="end_time" value="">
      <input id="capacity" value="">
      
      <div id="equipmentOptions"></div>
      <div id="tableLayoutOptions"></div>
      <div id="roomsGrid"></div>
      
      <div id="bookingModal" class="">
        <div class="modal-header"><h3></h3></div>
        <input id="modal_attendees" value="1">
        <input id="meeting_title" value="">
        <div class="modal-footer"><button class="btn primary">Confirm</button></div>
      </div>
      
      <div id="altRoomModal" class=""></div>
      <div id="altRoomList"></div>
      <button id="confirmMoveBtn"></button>
    `;

    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.removeItem = jest.fn();

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

  test("ควรตั้งค่าวันที่ปัจจุบันตอนโหลดหน้าเว็บ", () => {
    require("../js/BookingMeetingRoom.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const today = new Date().toISOString().split("T")[0];
    expect(document.getElementById("date").value).toBe(today);
  });
});
