document.addEventListener("DOMContentLoaded", async function () {

  let userRole = sessionStorage.getItem("userRole");
  let roleId = sessionStorage.getItem("roleId");

  console.log("Current userRole:", userRole, "| roleId:", roleId);

  if (!userRole || !roleId) {
    console.warn("No userRole found! Redirecting to login...");
    userRole = "Admin";
    roleId = "1";
  }

  const menuTitle = document.getElementById("menuTitle");
  if (menuTitle) {
    menuTitle.textContent = `Menu ${userRole}`;
  }

  let allowedPermissions = [];
  try {
    const res = await fetch(`/src/api/get_role_permissions.php?action=get_role_permissions&role_id=${roleId}`);
    const data = await res.json();

    if (data.success) {
      const res2 = await fetch(`/src/api/get_role_permissions.php?action=get_role_detail&role_id=${roleId}`);
      const data2 = await res2.json();

      if (data2.success) {
        allowedPermissions = data2.data.permissions.map(p => p.permission_name);
        console.log("Allowed permissions:", allowedPermissions);
      }
    }
  } catch (e) {
    console.error("fetch permissions error:", e);
    useFallback(userRole);
    return;
  }

  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach((item) => {
    const dataPage = item.getAttribute("data-page");
    const menuName = item.querySelector("span")?.textContent;

    if (!dataPage) return;

    if (allowedPermissions.includes(dataPage)) {
      item.style.display = "flex";
      console.log("Shown:", menuName);
    } else {
      item.style.display = "none";
      console.log("Hidden:", menuName);
    }
  });


  setActiveMenu();
});

function useFallback(userRole) {
  console.warn("⚠️ Using fallback data-roles mode");
  document.querySelectorAll(".nav-item").forEach((item) => {
    const allowedRoles = item.getAttribute("data-roles");
    if (allowedRoles) {
      item.style.display = allowedRoles.split(",").includes(userRole) ? "flex" : "none";
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

  let currentFile = currentPath.split("/").pop().toLowerCase();
  let pageIdentifier = currentFile.split(".")[0];

  if (pageIdentifier.includes("bookingmeetingroom")) pageIdentifier = "booking";
  if (pageIdentifier === "") pageIdentifier = "booking";

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
    const dataPage = item.getAttribute("data-page");
    if (dataPage && pageIdentifier === dataPage) {
      console.log("Matched data-page:", dataPage);
      item.classList.add("active");
    }
  });
}