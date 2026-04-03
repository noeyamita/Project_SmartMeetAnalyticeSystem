document.addEventListener("DOMContentLoaded", async function () {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.style.visibility = "hidden";
  });

  let userRole = sessionStorage.getItem("userRole");
  let roleId = sessionStorage.getItem("roleId");

  if (!userRole || !roleId) {
    console.warn("No session found! Redirecting to login...");
    try {
      window.top.location.href = "/login.html";
    } catch (e) {
      window.location.href = "/login.html";
    }
    return;
  }

  const menuTitle = document.getElementById("menuTitle");
  if (menuTitle) menuTitle.textContent = `เมนู (${userRole})`;

  let allowedPermissions = [];
  try {
    const res = await fetch(
      `/src/api/get_role_permissions.php?action=get_role_permissions&role_id=${roleId}`,
    );
    const data = await res.json();

    if (data.success) {
      const res2 = await fetch(
        `/src/api/get_role_permissions.php?action=get_role_detail&role_id=${roleId}`,
      );
      const data2 = await res2.json();
      if (data2.success) {
        allowedPermissions = data2.data.permissions.map((p) =>
          p.permission_name.trim(),
        );
      }
    }
  } catch (e) {
    console.error("fetch permissions error:", e);
    useFallback(userRole);
    return;
  }

  // ตรวจสอบการแสดงผลเมนูตามสิทธิ์จาก DB
  document.querySelectorAll(".nav-item").forEach((item) => {
    const dataPage = item.getAttribute("data-page");
    if (!dataPage) return;

    if (allowedPermissions.includes(dataPage)) {
      item.style.display = "flex";
      item.style.visibility = "visible";
    } else {
      item.style.display = "none";
    }
  });

  setActiveMenu();

  // โหลด Badge แจ้งเตือน
  loadUnreadBadge();
  setInterval(loadUnreadBadge, 15000);

  // โหลด Badge คำขอใช้ห้อง
  loadRoomRequestBadge();
  setInterval(loadRoomRequestBadge, 15000);
});

// --- ฟังก์ชันจัดการ Badge (ใช้ร่วมกันเพื่อลดความซ้ำซ้อน) ---
function updateBadge(selector, count, color = null) {
  const item = document.querySelector(`.nav-item[data-page="${selector}"]`);
  if (!item) return;

  // ลบ Badge เก่าออกก่อน
  item.querySelector(".badge")?.remove();

  if (count > 0) {
    const badge = document.createElement("span");
    badge.className = "badge";
    if (color) badge.style.backgroundColor = color;
    badge.textContent = count > 99 ? "99+" : count;
    item.appendChild(badge);
  }
}

async function loadUnreadBadge() {
  try {
    const res = await fetch("/src/api/getnotifications.php");
    const result = await res.json();
    if (result.success) {
      updateBadge("notifications", result.unread_count);
    }
  } catch (e) {}
}

async function loadRoomRequestBadge() {
  const reqItem = document.querySelector(
    '.nav-item[data-page="room_requests"]',
  );
  if (!reqItem || reqItem.style.display === "none") return;

  try {
    const res = await fetch("/src/api/getPendingRequestCount.php");
    const result = await res.json();
    if (result.status === "success") {
      updateBadge("room_requests", result.count, "#ef4444");
    }
  } catch (e) {
    console.error("Error loading room request badge:", e);
  }
}

// --- ฟังก์ชันอื่นๆ ---
function useFallback(userRole) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    const allowedRoles = item.getAttribute("data-roles");
    if (allowedRoles) {
      const show = allowedRoles.split(",").includes(userRole);
      item.style.display = show ? "flex" : "none";
      item.style.visibility = show ? "visible" : "hidden";
    }
  });
  setActiveMenu();
}

function setActiveMenu() {
  let currentPath = "";
  try {
    currentPath = window.top.location.pathname;
  } catch (e) {
    currentPath = window.location.pathname;
  }

  let currentFile =
    currentPath.split("/").pop().toLowerCase() || "bookingmeetingroom.html";
  let pageIdentifier = currentFile.split(".")[0].replace(/-/g, "_");

  // Mapping พิเศษสำหรับหน้าจอง
  if (pageIdentifier.includes("bookingmeetingroom")) pageIdentifier = "booking";

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
    if (item.getAttribute("data-page") === pageIdentifier) {
      item.classList.add("active");
    }
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {};
}
