const API = "../src/api/";
let allNotifications = [];
let activeFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
  loadNotifications();
  setInterval(loadNotifications, 10000);
});

// โหลด Notifications
async function loadNotifications() {
  try {
    const res = await fetch(`${API}getnotifications.php`);
    const result = await res.json();

    if (result.success) {
      allNotifications = result.data;
      const filtered =
        activeFilter === "all"
          ? allNotifications
          : allNotifications.filter((n) => n.type === activeFilter);
      renderNotifications(filtered);
      updateUnreadCount(result.unread_count);
    }
  } catch (err) {
    console.error("loadNotifications error:", err);
    document.getElementById("notificationList").innerHTML =
      '<div class="empty-state"><div class="icon"><i class="fa-solid fa-circle-xmark" style="color: #dc3545;"></i></div>เกิดข้อผิดพลาดในการโหลด</div>';
  }
}

// Render รายการ Notifications
function renderNotifications(notifications) {
  const list = document.getElementById("notificationList");

  if (!notifications.length) {
    list.innerHTML =
      '<div class="empty-state"><div class="icon"><i class="fa-solid fa-bell-slash" style="color: #6c757d;"></i></div>ไม่มีการแจ้งเตือน</div>';
    return;
  }

  list.innerHTML = notifications
    .map(
      (n) => `
        <div class="notification-item ${n.is_read == 0 ? "unread" : ""} type-${n.type}"
             onclick="markRead(${n.notification_id}, this)">
            ${n.is_read == 0 ? '<div class="unread-dot"></div>' : ""}
            <div class="notification-top">
                <span class="notification-type-label">${n.type_label}</span>
                <span class="notification-time">${n.sent_at_thai}</span>
            </div>
            <div class="notification-message">${n.message}</div>
        </div>
    `,
    )
    .join("");
}

// Filter ตาม Type
function filterNotifications(type, btn) {
  document
    .querySelectorAll(".filter-tab")
    .forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  activeFilter = type;

  const filtered =
    type === "all"
      ? allNotifications
      : allNotifications.filter((n) => n.type === type);

  renderNotifications(filtered);
}

// Mark อ่านแล้ว - ทีละอัน
async function markRead(id, el) {
  if (!el.classList.contains("unread")) return;

  await fetch(`${API}markNotificationRead.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "single", notification_id: id }),
  });

  el.classList.remove("unread");
  el.querySelector(".unread-dot")?.remove();

  const n = allNotifications.find((n) => n.notification_id == id);
  if (n) n.is_read = 1;

  const newCount = allNotifications.filter((n) => n.is_read == 0).length;
  updateUnreadCount(newCount);
  notifySidebarBadge(newCount);
}

// Mark อ่านแล้ว - ทั้งหมด
async function markAllRead() {
  await fetch(`${API}markNotificationRead.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "all" }),
  });

  allNotifications.forEach((n) => (n.is_read = 1));
  renderNotifications(allNotifications);
  updateUnreadCount(0);
  notifySidebarBadge(0);
}

// unread counter
function updateUnreadCount(count) {
  const icon =
    count > 0
      ? '<i class="fa-solid fa-circle-exclamation"></i> '
      : '<i class="fa-solid fa-circle-check"></i> ';
  document.getElementById("unreadCount").innerHTML =
    count > 0
      ? `${icon}มี ${count} การแจ้งเตือนที่ยังไม่ได้อ่าน`
      : `${icon}อ่านครบแล้ว`;
}

function notifySidebarBadge(count) {
  try {
    const sidebarFrame = window.top.document.querySelector(
      "iframe.sidebar-frame",
    );
    if (sidebarFrame?.contentWindow) {
      sidebarFrame.contentWindow.postMessage(
        {
          type: "refreshNotificationBadge",
          count: count,
        },
        "*",
      );
    }
  } catch (e) {
    console.warn("notifySidebarBadge error:", e);
  }
}
