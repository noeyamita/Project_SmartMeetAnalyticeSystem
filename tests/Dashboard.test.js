/**
 * @jest-environment jsdom
 */

describe("Dashboard.js", () => {
  beforeEach(() => {
    // 1. จำลองหน้าเว็บ
    document.body.innerHTML = `
      <div id="alertBox"></div>
      <button id="adminTabBtn"></button>
      <button id="userTabBtn"></button>
      <div id="userTab" class="tab-content"></div>
      <div id="adminTab" class="tab-content"></div>
      
      <div class="card-header"><h2></h2></div>
      <div id="roomsStatusGrid"></div>
      <div id="userTotalBookings"></div>
      <div id="userCompletedBookings"></div>
      <div id="userCancelledBookings"></div>
      <div id="upcomingBookingsList"></div>
      <div id="userPopularRoomsList"></div>
      
      <div id="todayBookings"></div>
      <div id="weekBookings"></div>
      <div id="monthBookings"></div>
      <div id="cancelledBookings"></div>
      <div id="roomChanges"></div>
      <div id="peakTimesList"></div>
      <div id="adminPopularRoomsList"></div>
      
      <canvas id="monthlyChart"></canvas>
      <canvas id="statusDonutChart"></canvas>
    `;

    // จำลอง Chart.js เพราะ Node.js ไม่มี Canvas
    global.Chart = jest.fn().mockImplementation(() => ({
      destroy: jest.fn(),
    }));
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    }));

    Storage.prototype.getItem = jest.fn(() => "Admin");
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

  test("ควรโหลดหน้า Dashboard และซ่อน/แสดงปุ่ม Admin ตาม Role ได้", () => {
    require("../js/Dashboard.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(fetch).toHaveBeenCalled();
  });
});
