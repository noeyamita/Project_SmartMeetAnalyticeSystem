// ใช้ API_BASE สำหรับเรียก API
const API_BASE = "src/api/";
const API_URL = API_BASE + "get_role_permissions.php";

let currentRoleId = null;
let currentRoleName = null;
let originalPermissions = [];
let editingRoleId = null;
let deleteRoleId = null;

// โหลดข้อมูล roles เมื่อเริ่มต้น
async function loadRoles() {
  try {
    const response = await fetch(`${API_URL}?action=get_roles`);
    const contentType = response.headers.get("content-type");

    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Response is not JSON:", text.substring(0, 200));
      showToast("ไฟล์ PHP ไม่พบหรือไม่สามารถเรียกใช้งานได้", "error");
      return;
    }

    const result = await response.json();

    if (result.success && result.data && result.data.length > 0) {
      displayRoles(result.data);
    } else {
      document.getElementById("rolesList").innerHTML =
        '<div class="empty-state"><div class="empty-icon">📋</div><p>ไม่มีข้อมูลตำแหน่งในระบบ</p></div>';
    }
  } catch (error) {
    console.error("Error loading roles:", error);
    showToast("เกิดข้อผิดพลาดในการโหลดข้อมูล", "error");
  }
}

// โหลดข้อมูล permissions เมื่อเริ่มต้น
async function loadPermissions() {
  try {
    const response = await fetch(`${API_URL}?action=get_permissions`);
    const contentType = response.headers.get("content-type");

    if (!contentType || !contentType.includes("application/json")) {
      showToast("เกิดข้อผิดพลาดในการโหลดเมนู", "error");
      return;
    }

    const result = await response.json();

    if (result.success && result.data && result.data.length > 0) {
      // เก็บข้อมูล permissions ไว้ใช้ตอน select role
      window.allPermissions = result.data;
    }
  } catch (error) {
    console.error("Error loading permissions:", error);
    showToast("เกิดข้อผิดพลาดในการโหลดเมนู", "error");
  }
}

// แสดง roles
function displayRoles(roles) {
  const rolesList = document.getElementById("rolesList");

  if (!roles || roles.length === 0) {
    rolesList.innerHTML =
      '<div class="empty-state"><div class="empty-icon">📋</div><p>ไม่มีข้อมูลตำแหน่ง</p></div>';
    return;
  }

  rolesList.innerHTML = "";

  roles.forEach((role) => {
    const div = document.createElement("div");
    div.className = "role-card";
    div.dataset.roleId = role.role_id;

    div.innerHTML = `
            <div class="role-name">${role.role_name}</div>
            <div class="role-actions">
                <button class="icon-btn edit" onclick="event.stopPropagation(); showEditRoleModal(${role.role_id}, '${role.role_name.replace(/'/g, "\\'")}')">✏️</button>
                <button class="icon-btn delete" onclick="event.stopPropagation(); showDeleteRoleModal(${role.role_id}, '${role.role_name.replace(/'/g, "\\'")}')">🗑️</button>
            </div>
        `;

    div.onclick = () => selectRole(role.role_id, role.role_name);
    rolesList.appendChild(div);
  });
}

// แสดงเมนู items
function displayMenuItems(permissions) {
  const menuGrid = document.getElementById("menuGrid");

  if (!permissions || permissions.length === 0) {
    menuGrid.innerHTML =
      '<p style="text-align:center; color: #999;">ไม่มีข้อมูลเมนู</p>';
    return;
  }

  menuGrid.innerHTML = "";

  permissions.forEach((perm) => {
    const div = document.createElement("div");
    div.className = "menu-item";
    div.dataset.permissionId = perm.permission_id;
    div.textContent = perm.permission_name;
    div.onclick = () => togglePermission(div);
    menuGrid.appendChild(div);
  });
}

// เลือก role
async function selectRole(roleId, roleName) {
  currentRoleId = roleId;
  currentRoleName = roleName;
  document.querySelectorAll(".role-card").forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.roleId == roleId) {
      item.classList.add("active");
    }
  });

  document.getElementById("permissionTitle").textContent =
    `จัดการสิทธิ์: ${roleName}`;
  document.getElementById("emptyState").classList.add("hidden");
  document.getElementById("permissionsContent").classList.remove("hidden");

  // แสดง permissions ทั้งหมด
  if (window.allPermissions) {
    displayMenuItems(window.allPermissions);
  }

  // โหลด permissions ของ role นี้
  await loadRolePermissions(roleId);
}

// โหลด permissions ของ role ที่เลือก
async function loadRolePermissions(roleId) {
  try {
    const response = await fetch(
      `${API_URL}?action=get_role_permissions&role_id=${roleId}`,
    );
    const result = await response.json();

    if (result.success) {
      originalPermissions = [...result.data];
      updateMenuDisplay(result.data);
    } else {
      showToast("โหลดสิทธิ์ไม่สำเร็จ", "error");
    }
  } catch (error) {
    console.error("Error loading role permissions:", error);
    showToast("เกิดข้อผิดพลาดในการโหลดสิทธิ์", "error");
  }
}

// อัพเดทการแสดงผลเมนู
function updateMenuDisplay(permissionIds) {
  document.querySelectorAll(".menu-item").forEach((item) => {
    const permId = parseInt(item.dataset.permissionId);
    if (permissionIds.includes(permId)) {
      item.classList.add("checked");
    } else {
      item.classList.remove("checked");
    }
  });
}

function togglePermission(element) {
  element.classList.toggle("checked");
}

async function savePermissions() {
  if (!currentRoleId) {
    showToast("กรุณาเลือกตำแหน่งก่อน", "error");
    return;
  }

  const checkedItems = document.querySelectorAll(".menu-item.checked");
  const permissions = Array.from(checkedItems).map((item) =>
    parseInt(item.dataset.permissionId),
  );

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role_id: currentRoleId,
        permissions: permissions,
      }),
    });

    const result = await response.json();

    if (result.success) {
      showToast(
        `บันทึกสิทธิ์สำเร็จ (${result.permissions_count} เมนู)`,
        "success",
      );
      originalPermissions = [...permissions];
    } else {
      showToast("บันทึกไม่สำเร็จ: " + result.message, "error");
    }
  } catch (error) {
    console.error("Error saving permissions:", error);
    showToast("เกิดข้อผิดพลาดในการบันทึก", "error");
  }
}

// ยกเลิกการแก้ไข
function resetPermissions() {
  if (currentRoleId) {
    updateMenuDisplay(originalPermissions);
    showToast("ยกเลิกการแก้ไขแล้ว", "success");
  } else {
    showToast("กรุณาเลือกตำแหน่งก่อน", "error");
  }
}

// Modal
function showAddRoleModal() {
  editingRoleId = null;
  document.getElementById("modalTitle").textContent = "เพิ่มตำแหน่งใหม่";
  document.getElementById("roleNameInput").value = "";
  document.getElementById("roleModal").classList.add("show");
}

function showEditRoleModal(roleId, roleName) {
  editingRoleId = roleId;
  document.getElementById("modalTitle").textContent = "แก้ไขชื่อตำแหน่ง";
  document.getElementById("roleNameInput").value = roleName;
  document.getElementById("roleModal").classList.add("show");
}

function closeRoleModal() {
  document.getElementById("roleModal").classList.remove("show");
  editingRoleId = null;
}

async function saveRole() {
  const roleName = document.getElementById("roleNameInput").value.trim();

  if (!roleName) {
    showToast("กรุณากรอกชื่อตำแหน่ง", "error");
    return;
  }

  try {
    const url = editingRoleId
      ? `${API_URL}?action=update_role`
      : `${API_URL}?action=add_role`;

    const body = editingRoleId
      ? { role_id: editingRoleId, role_name: roleName }
      : { role_name: roleName };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (result.success) {
      showToast(
        editingRoleId ? "แก้ไขตำแหน่งสำเร็จ" : "เพิ่มตำแหน่งสำเร็จ",
        "success",
      );
      closeRoleModal();
      await loadRoles();
    } else {
      showToast(result.message, "error");
    }
  } catch (error) {
    console.error("Error saving role:", error);
    showToast("เกิดข้อผิดพลาด", "error");
  }
}

function showDeleteRoleModal(roleId, roleName) {
  deleteRoleId = roleId;
  document.getElementById("deleteMessage").textContent =
    `คุณต้องการลบตำแหน่ง "${roleName}" หรือไม่?`;
  document.getElementById("deleteModal").classList.add("show");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.remove("show");
  deleteRoleId = null;
}

async function confirmDeleteRole() {
  if (!deleteRoleId) return;

  try {
    const response = await fetch(`${API_URL}?action=delete_role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_id: deleteRoleId }),
    });

    const result = await response.json();

    if (result.success) {
      showToast("ลบตำแหน่งสำเร็จ", "success");
      closeDeleteModal();
      if (currentRoleId === deleteRoleId) {
        currentRoleId = null;
        currentRoleName = null;
        document.getElementById("permissionTitle").textContent =
          "เลือกตำแหน่งเพื่อจัดการสิทธิ์";
        document.getElementById("emptyState").classList.remove("hidden");
        document.getElementById("permissionsContent").classList.add("hidden");
      }

      await loadRoles();
    } else {
      showToast(result.message, "error");
    }
  } catch (error) {
    console.error("Error deleting role:", error);
    showToast("เกิดข้อผิดพลาด", "error");
  }
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.querySelector(".search-input");
  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      const searchTerm = e.target.value.toLowerCase();
      document.querySelectorAll(".role-card").forEach((item) => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? "flex" : "none";
      });
    });
  }

  // ปิด modal เมื่อคลิ๊กนอก model
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", function () {
      this.closest(".modal").classList.remove("show");
    });
  });

  // โหลดข้อมูลเริ่มต้น
  Promise.all([loadRoles(), loadPermissions()])
    .then(() => {
      console.log("✅ All data loaded successfully");
    })
    .catch((error) => {
      console.error("❌ Error loading data:", error);
      showToast("เกิดข้อผิดพลาดในการโหลดข้อมูล", "error");
    });
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = { showToast, showAddRoleModal, closeRoleModal };
}
