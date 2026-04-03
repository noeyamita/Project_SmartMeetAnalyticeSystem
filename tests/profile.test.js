/**
 * @jest-environment jsdom
 */

describe("profile.js", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="full-name" value="">
      <input id="user-email" value="">
      <input id="user-phone" value="">
      <button id="toggle-edit-info"></button>
      <form id="edit-profile-form"><div class="form-actions"></div></form>
      <div id="email-confirmation-fields" style="display: none;"></div>
      <input id="confirm-email-password" value="">
      <form id="password-form"></form>
      <table id="booking-table"><tbody></tbody></table>
      <button id="apply-filter-btn"></button>
      <input id="filter-date" value="">
      <select id="filter-status"></select>
      <button id="tab-profile"></button>
    `;

    // จำลอง SweetAlert2
    global.Swal = {
      fire: jest.fn(() => Promise.resolve({ isConfirmed: true })),
    };

    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            status: "success",
            data: {
              user_id: 1,
              fname: "Test",
              lname: "User",
              email: "test@test.com",
              role_id: 1,
            },
          }),
      }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("ควรโหลดหน้า Profile และดึงข้อมูลผู้ใช้สำเร็จโดยไม่เกิด Error", () => {
    require("../js/profile.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(fetch).toHaveBeenCalled();
  });
});
