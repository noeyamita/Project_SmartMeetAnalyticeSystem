document.addEventListener("DOMContentLoaded", async function () {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.style.visibility = "hidden";
  });

  let userRole = sessionStorage.getItem("userRole");
  let roleId = sessionStorage.getItem("roleId");

  if (!userRole || !roleId) {
    console.warn("No session found! Redirecting to login...");
    try {
      window.top.location.href = '/login.html';
    } catch (e) {
      window.location.href = '/login.html';
    }
    return;
  }

  const menuTitle = document.getElementById("menuTitle");
  if (menuTitle) menuTitle.textContent = `Menu ${userRole}`;

  let allowedPermissions = [];
  try {
    const res = await fetch(`/src/api/get_role_permissions.php?action=get_role_permissions&role_id=${roleId}`);
    const data = await res.json();

    if (data.success) {
      const res2 = await fetch(`/src/api/get_role_permissions.php?action=get_role_detail&role_id=${roleId}`);
      const data2 = await res2.json();
      if (data2.success) {
        allowedPermissions = data2.data.permissions.map(p => p.permission_name);
      }
    }
  } catch (e) {
    console.error("fetch permissions error:", e);
    useFallback(userRole);
    return;
  }

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
  loadUnreadBadge();
  setInterval(loadUnreadBadge, 15000);
});

async function loadUnreadBadge() {
  try {
    const res = await fetch('/src/api/getnotifications.php');
    const result = await res.json();
    if (result.success) {
      updateNotificationBadge(result.unread_count);
    }
  } catch (e) { }
}

function updateNotificationBadge(count) {
  const notifItem = document.querySelector('.nav-item[data-page="notifications"]');
  if (!notifItem) return;

  notifItem.querySelector('.badge')?.remove();

  if (count > 0) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = count > 99 ? '99+' : count;
    notifItem.appendChild(badge);
  }
}

function useFallback(userRole) {
  console.warn("Using fallback data-roles mode");
  document.querySelectorAll(".nav-item").forEach((item) => {
    const allowedRoles = item.getAttribute("data-roles");
    if (allowedRoles) {
      const show = allowedRoles.split(",").includes(userRole);
      item.style.display = show ? "flex" : "none";
      item.style.visibility = show ? "visible" : "hidden";
    }
  });
  setActiveMenu();
  loadUnreadBadge();
}

function setActiveMenu() {
  let currentPath = "";
  try {
    currentPath = window.top.location.pathname;
  } catch (e) {
    currentPath = window.location.pathname;
  }

  let currentFile = currentPath.split("/").pop().toLowerCase();
  let pageIdentifier = currentFile.split(".")[0];

  if (pageIdentifier.includes("bookingmeetingroom")) pageIdentifier = "booking";
  if (pageIdentifier === "") pageIdentifier = "booking";

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
    const dataPage = item.getAttribute("data-page");
    if (dataPage && pageIdentifier === dataPage) {
      item.classList.add("active");
    }
  });
}