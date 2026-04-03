/**
 * @jest-environment jsdom
 */

describe("ForgotPassword.js", () => {
  beforeEach(() => {
    // 1. จำลองหน้าเว็บ
    document.body.innerHTML = `
      <form id="forgotPasswordForm">
          <div class="input-box">
              <input id="email" type="email" value="">
          </div>
          <button class="btn" type="submit">Send Reset Link</button>
      </form>
      <div id="alertBox"></div>
      <div id="successMessage" style="display: none;"></div>
    `;

    // 2. จำลอง fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve(JSON.stringify({ success: true })),
        status: 200,
      }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("ควรโหลดไฟล์โดยไม่เกิด Error", () => {
    require("../js/ForgotPassword.js");
    expect(document.getElementById("forgotPasswordForm")).not.toBeNull();
  });
});
