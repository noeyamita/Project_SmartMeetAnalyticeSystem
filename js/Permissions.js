// ใช้ relative path แทน absolute path
const API_URL = './get_role_permissions.php';  // เปลี่ยนจาก 'get_role_permissions.php'
let currentRoleId = null;
let originalPermissions = [];

// โหลดข้อมูล roles เมื่อเริ่มต้น
async function loadRoles() {
    try {
        console.log('Loading roles from:', API_URL);
        const response = await fetch(`${API_URL}?action=get_roles`);

        // ตรวจสอบว่า response เป็น JSON หรือไม่
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Response is not JSON:', text.substring(0, 200));
            showNotification('ไฟล์ PHP ไม่พบหรือไม่สามารถเรียกใช้งานได้', 'error');
            return;
        }

        const result = await response.json();
        console.log('Roles response:', result);

        if (result.success) {
            displayRoles(result.data);
        } else {
            showNotification('โหลด roles ไม่สำเร็จ: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading roles:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message, 'error');
    }
}

// โหลดข้อมูล permissions เมื่อเริ่มต้น
async function loadPermissions() {
    try {
        console.log('Loading permissions from:', API_URL);
        const response = await fetch(`${API_URL}?action=get_permissions`);

        // ตรวจสอบว่า response เป็น JSON หรือไม่
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Response is not JSON:', text.substring(0, 200));
            showNotification('ไฟล์ PHP ไม่พบหรือไม่สามารถเรียกใช้งานได้', 'error');
            return;
        }

        const result = await response.json();
        console.log('Permissions response:', result);

        if (result.success) {
            displayMenuItems(result.data);
        } else {
            showNotification('โหลดเมนูไม่สำเร็จ: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading permissions:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดเมนู: ' + error.message, 'error');
    }
}

// แสดง roles
function displayRoles(roles) {
    const positionsList = document.getElementById('positionsList');

    if (!roles || roles.length === 0) {
        positionsList.innerHTML = '<p style="text-align:center; padding:20px; color:#999;">ไม่มีข้อมูล Role</p>';
        return;
    }

    positionsList.innerHTML = '';

    roles.forEach(role => {
        const div = document.createElement('div');
        div.className = 'position-item';
        div.dataset.roleId = role.role_id;
        div.innerHTML = `
            <span>${role.role_name}</span>
            <div class="position-actions">
                <button class="btn-action btn-select" onclick="selectRole(${role.role_id}, '${role.role_name}')">Select</button>
                <button class="btn-action btn-edit">Edit</button>
            </div>
        `;
        positionsList.appendChild(div);
    });

    console.log('Displayed', roles.length, 'roles');
}

// แสดงเมนู items
function displayMenuItems(permissions) {
    const menuGrid = document.getElementById('menuGrid');

    if (!permissions || permissions.length === 0) {
        menuGrid.innerHTML = '<p style="text-align:center; padding:20px; color:#999;">ไม่มีข้อมูลเมนู</p>';
        return;
    }

    menuGrid.innerHTML = '';

    permissions.forEach(perm => {
        const div = document.createElement('div');
        div.className = 'menu-item';
        div.dataset.permissionId = perm.permission_id;
        div.innerHTML = `
            <div class="checkbox"></div>
            <span><span class="menu-icon">${perm.icon || '📌'}</span> ${perm.permission_name}</span>
        `;
        div.addEventListener('click', () => togglePermission(div));
        menuGrid.appendChild(div);
    });

    console.log('Displayed', permissions.length, 'menu items');
}

// เลือก role
async function selectRole(roleId, roleName) {
    console.log('Selecting role:', roleId, roleName);
    currentRoleId = roleId;

    // Highlight selected role
    document.querySelectorAll('.position-item').forEach(item => {
        item.classList.remove('selected');
        if (item.dataset.roleId == roleId) {
            item.classList.add('selected');
        }
    });

    // Update title
    document.getElementById('permissionTitle').textContent = `Permission for: ${roleName}`;

    // โหลด permissions ของ role นี้
    await loadRolePermissions(roleId);
}

// โหลด permissions ของ role ที่เลือก
async function loadRolePermissions(roleId) {
    try {
        console.log('Loading permissions for role:', roleId);
        const response = await fetch(`${API_URL}?action=get_role_permissions&role_id=${roleId}`);
        const result = await response.json();

        console.log('Role permissions response:', result);

        if (result.success) {
            originalPermissions = [...result.data];
            updateMenuDisplay(result.data);
            showNotification('โหลดสิทธิ์สำเร็จ', 'success');
        } else {
            showNotification('โหลดสิทธิ์ไม่สำเร็จ: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading role permissions:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดสิทธิ์: ' + error.message, 'error');
    }
}

// อัพเดทการแสดงผลเมนู
function updateMenuDisplay(permissionIds) {
    console.log('Updating menu display with permissions:', permissionIds);

    document.querySelectorAll('.menu-item').forEach(item => {
        const permId = parseInt(item.dataset.permissionId);
        if (permissionIds.includes(permId)) {
            item.classList.add('checked');
        } else {
            item.classList.remove('checked');
        }
    });
}

// Toggle permission
function togglePermission(element) {
    element.classList.toggle('checked');
}

// บันทึก permissions
async function savePermissions() {
    if (!currentRoleId) {
        showNotification('กรุณาเลือก Role ก่อน', 'error');
        return;
    }

    const checkedItems = document.querySelectorAll('.menu-item.checked');
    const permissions = Array.from(checkedItems).map(item =>
        parseInt(item.dataset.permissionId)
    );

    console.log('Saving permissions:', { role_id: currentRoleId, permissions: permissions });

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                role_id: currentRoleId,
                permissions: permissions
            })
        });

        const result = await response.json();
        console.log('Save response:', result);

        if (result.success) {
            showNotification('บันทึกสิทธิ์สำเร็จ', 'success');
            originalPermissions = [...permissions];
        } else {
            showNotification('บันทึกไม่สำเร็จ: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving permissions:', error);
        showNotification('เกิดข้อผิดพลาดในการบันทึก: ' + error.message, 'error');
    }
}

// ยกเลิกการแก้ไข
function resetPermissions() {
    if (currentRoleId) {
        updateMenuDisplay(originalPermissions);
        showNotification('ยกเลิกการแก้ไขแล้ว', 'success');
    } else {
        showNotification('กรุณาเลือก Role ก่อน', 'error');
    }
}

// แสดง notification
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Search functionality
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.querySelector('.position-search');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            const searchTerm = e.target.value.toLowerCase();
            document.querySelectorAll('.position-item').forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(searchTerm) ? 'flex' : 'none';
            });
        });
    }

    // โหลดข้อมูลเมื่อเริ่มต้น
    console.log('Page loaded, loading initial data...');
    console.log('API URL:', API_URL);
    loadRoles();
    loadPermissions();
});