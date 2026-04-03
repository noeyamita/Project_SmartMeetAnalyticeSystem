const API_BASE = "../src/api/";

document.addEventListener("DOMContentLoaded", () => {
  console.log("[ForgotPassword] DOM loaded");

  const form = document.getElementById("forgotPasswordForm");
  const alertBox = document.getElementById("alertBox");

  console.log("[ForgotPassword] form found:", !!form);
  console.log("[ForgotPassword] alertBox found:", !!alertBox);

  if (!alertBox) {
    console.warn(
      "[ForgotPassword] ⚠️ ไม่พบ #alertBox ใน HTML — alert จะไม่แสดง!",
    );
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      console.log("[ForgotPassword] form submitted");
      sendResetPassword();
    });
  }
});

function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function showAlert(message, type = "error", duration = 4000) {
  console.log(`[ForgotPassword] showAlert → type: ${type}, msg: ${message}`);

  const alertBox = document.getElementById("alertBox");
  if (!alertBox) {
    console.warn(
      '[ForgotPassword] ⚠️ ไม่พบ #alertBox — กรุณาเพิ่ม <div id="alertBox"></div> ใน HTML',
    );
    return;
  }

  alertBox.textContent = message;
  alertBox.className = `alert ${type} active`;
  setTimeout(() => {
    alertBox.className = "alert";
  }, duration);
}

function setLoading(isLoading) {
  const btn = document.querySelector("#forgotPasswordForm .btn");
  if (!btn) {
    console.warn("[ForgotPassword] ⚠️ ไม่พบปุ่ม .btn ใน #forgotPasswordForm");
    return;
  }

  if (isLoading) {
    btn.dataset.orig = btn.textContent;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังส่ง...';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.orig || "Send Reset Link";
    btn.disabled = false;
  }
}

function showSuccess(email) {
  const masked = maskEmail(email);
  const successEl = document.getElementById("successMessage");
  const inputBox = document.querySelector("#forgotPasswordForm .input-box");
  const btn = document.querySelector("#forgotPasswordForm .btn");

  console.log("[ForgotPassword] showSuccess → successEl found:", !!successEl);

  if (inputBox) inputBox.style.display = "none";
  if (btn) btn.style.display = "none";

  if (successEl) {
    successEl.style.display = "block";
    successEl.innerHTML = `
      <p style="color: #10b981; font-size: 1.1em;">
        <i class="fa-solid fa-circle-check"></i> ส่งรหัสผ่านชั่วคราวไปที่ <strong>${masked}</strong> แล้ว
      </p>
      <p style="font-size: 0.9em; color: #64748b;">กรุณาตรวจสอบกล่องจดหมาย (รวมถึงโฟลเดอร์ Spam)</p>
    `;
  } else {
    console.warn("[ForgotPassword] ⚠️ ไม่พบ #successMessage ใน HTML");
  }
}

function maskEmail(email) {
  const [local, domain] = email.split("@");
  const masked =
    local.length <= 2
      ? "*".repeat(local.length)
      : local[0] + "*".repeat(local.length - 2) + local.slice(-1);
  return `${masked}@${domain}`;
}

async function sendResetPassword() {
  const emailInput = document.getElementById("email");
  if (!emailInput) {
    console.error("[ForgotPassword] ❌ ไม่พบ input#email ใน HTML");
    return;
  }

  const email = emailInput.value.trim();
  console.log("[ForgotPassword] sendResetPassword → email:", email);

  if (!email) {
    showAlert("กรุณากรอก email ก่อน");
    return;
  }

  if (!isValidEmail(email)) {
    showAlert("รูปแบบ email ไม่ถูกต้อง");
    return;
  }

  setLoading(true);

  try {
    const url = API_BASE + "forgot_password_api.php";
    console.log("[ForgotPassword] fetching →", url);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    console.log("[ForgotPassword] response status:", response.status);

    const text = await response.text();
    console.log("[ForgotPassword] raw response:", text);

    let result;
    try {
      result = JSON.parse(text);
      console.log("[ForgotPassword] parsed result:", result);
    } catch {
      console.error("[ForgotPassword] ❌ Server response (not JSON):", text);
      showAlert("เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง");
      return;
    }

    if (result.success) {
      console.log("[ForgotPassword] ✅ success!");
      showSuccess(email);
    } else {
      console.warn("[ForgotPassword] ⚠️ API returned error:", result.message);
      showAlert(result.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    }
  } catch (err) {
    console.error("[ForgotPassword] ❌ Fetch error:", err);
    showAlert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
  } finally {
    setLoading(false);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { isValidEmail, maskEmail, showAlert };
}
