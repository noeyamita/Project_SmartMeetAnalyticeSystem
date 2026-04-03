const API_BASE = "src/api/";
const API_USERS = API_BASE + "get_users_with_roles.php";
const API_ROLES = API_BASE + "get_role_permissions.php";
const API_UPDATE = API_BASE + "update_user_role.php";

let allUsers = [];
let allRoles = [];
let selectedUser = null;
let selectedRoleId = null;

// ============ Init ============
async function init() {
  await Promise.all([fetchUsers(), fetchRoles()]);
  renderUsers(allUsers);
}

// ============ Fetch Users ============
async function fetchUsers() {
  try {
    const res = await fetch(API_USERS);
    const data = await res.json();
    if (data.success) allUsers = data.users;
  } catch (e) {
    console.error("fetch users error", e);
  }
}

// ============ Fetch Roles ============
async function fetchRoles() {
  try {
    // ดึงจากตาราง roles (ถ้ามี API) หรือ hardcode จาก permissions.html
    // ถ้ามี API แยก ให้เปลี่ยน URL ด้านล่าง
    const res = await fetch(API_ROLES + "?action=get_roles");
    const data = await res.json();
    if (data.success) allRoles = data.data;
  } catch (e) {
    // fallback: ใช้ข้อมูลที่รู้จากหน้า permissions (Admin, Executive, Normal, new)
    allRoles = [
      { role_id: 1, role_name: "Admin" },
      { role_id: 2, role_name: "Executive" },
      { role_id: 3, role_name: "Normal" },
      { role_id: 4, role_name: "new" },
    ];
  }
}

// ============ Render Users ============
function renderUsers(users) {
  const list = document.getElementById("userList");
  if (!users.length) {
    list.innerHTML = '<div class="loading">ไม่พบผู้ใช้</div>';
    return;
  }

  list.innerHTML = users
    .map((u) => {
      const initials = (u.fname?.[0] ?? "") + (u.lname?.[0] ?? "");
      const roleName = u.role_name || `Role ${u.role_id}`;
      const isActive = selectedUser?.user_id == u.user_id ? "active" : "";
      const banned =
        u.is_banned == 1 ? '<span class="banned-tag">ถูกแบน</span>' : "";
      return `
                <div class="user-item ${isActive}" onclick="selectUser(${u.user_id})">
                    <div class="user-avatar">${initials}</div>
                    <div class="user-info">
                        <div class="user-name">${u.fname} ${u.lname}</div>
                        <div class="user-role-badge">${roleName}</div>
                    </div>
                    ${banned}
                </div>
            `;
    })
    .join("");
}

// ============ Select User ============
function selectUser(userId) {
  selectedUser = allUsers.find((u) => u.user_id == userId);
  if (!selectedUser) return;

  selectedRoleId = selectedUser.role_id;

  // Update UI
  document.getElementById("emptyState").style.display = "none";
  const panel = document.getElementById("rolePanel");
  panel.classList.add("visible");

  const initials =
    (selectedUser.fname?.[0] ?? "") + (selectedUser.lname?.[0] ?? "");
  document.getElementById("selectedAvatar").textContent = initials;
  document.getElementById("selectedName").textContent =
    `${selectedUser.fname} ${selectedUser.lname}`;
  document.getElementById("selectedEmail").textContent = selectedUser.email;

  renderRoles();
  renderUsers(filterUsers());
}

// ============ Render Roles ============
const roleIcons = {
  Admin: "fa-crown",
  Executive: "fa-briefcase",
  Normal: "fa-user",
  new: "fa-user-plus",
};

function renderRoles() {
  const grid = document.getElementById("rolesGrid");
  grid.innerHTML = allRoles
    .map((r) => {
      const icon = roleIcons[r.role_name] ?? "fa-circle";
      const isSelected = r.role_id == selectedRoleId ? "selected" : "";
      return `
                <div class="role-card ${isSelected}" onclick="pickRole(${r.role_id})">
                    <i class="fas ${icon}"></i>
                    <div class="role-card-name">${r.role_name}</div>
                    <div class="role-card-id">ID: ${r.role_id}</div>
                </div>
            `;
    })
    .join("");
}

function pickRole(roleId) {
  selectedRoleId = roleId;
  renderRoles();
}

// ============ Save ============
async function saveRole() {
  if (!selectedUser || !selectedRoleId) return;

  try {
    const res = await fetch(API_UPDATE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: selectedUser.user_id,
        role_id: selectedRoleId,
      }),
    });
    const data = await res.json();

    if (data.success) {
      // อัปเดต local state
      selectedUser.role_id = selectedRoleId;
      const role = allRoles.find((r) => r.role_id == selectedRoleId);
      selectedUser.role_name = role?.role_name ?? "";

      allUsers = allUsers.map((u) =>
        u.user_id == selectedUser.user_id ? { ...u, ...selectedUser } : u,
      );
      renderUsers(filterUsers());
      showToast("อัปเดต Role สำเร็จ!", "success");
    } else {
      showToast("เกิดข้อผิดพลาด: " + data.error, "error");
    }
  } catch (e) {
    showToast("ไม่สามารถเชื่อมต่อ server ได้", "error");
  }
}

// ============ Cancel ============
function cancelSelect() {
  selectedUser = null;
  selectedRoleId = null;
  document.getElementById("emptyState").style.display = "flex";
  document.getElementById("rolePanel").classList.remove("visible");
  renderUsers(filterUsers());
}

// ============ Search ============
function filterUsers() {
  const q = document.getElementById("searchInput").value.toLowerCase();
  return allUsers.filter((u) =>
    `${u.fname} ${u.lname}`.toLowerCase().includes(q),
  );
}

document.getElementById("searchInput").addEventListener("input", () => {
  renderUsers(filterUsers());
});

// ============ Toast ============
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas fa-${type === "success" ? "check-circle" : "exclamation-circle"}"></i> ${msg}`;
  setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

init();

if (typeof module !== "undefined" && module.exports) {
  module.exports = {};
}
