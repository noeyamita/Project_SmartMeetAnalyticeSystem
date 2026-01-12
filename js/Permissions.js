// ใช้ API_BASE สำหรับเรียก API
const API_BASE = "src/api/";
const API_URL = API_BASE + 'get_role_permissions.php';

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
            showNotification('❌ ไฟล์ PHP ไม่พบหรือไม่สามารถเรียกใช้งานได้', 'error');
            return;
        }

        const result = await response.json();
        console.log('Roles response:', result);

        if (result.success) {
            if (result.data && result.data.length > 0) {
                displayRoles(result.data);
                showNotification(`✅ โหลด ${result.count} Roles สำเร็จ`, 'success');
            } else {
                document.getElementById('positionsList').innerHTML =
                    '<p style="text-align:center; padding:20px; color:#999;">ไม่มีข้อมูล Role ในฐานข้อมูล</p>';
                showNotification('⚠️ ไม่พบข้อมูล Role ในระบบ', 'error');
            }
        } else {
            showNotification('❌ โหลด roles ไม่สำเร็จ: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading roles:', error);
        showNotification('❌ เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message, 'error');
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
            showNotification('❌ ไฟล์ PHP ไม่พบหรือไม่สามารถเรียกใช้งานได้', 'error');
            return;
        }

        const result = await response.json();
        console.log('Permissions response:', result);

        if (result.success) {
            if (result.data && result.data.length > 0) {
                displayMenuItems(result.data);
                showNotification(`✅ โหลด ${result.count} เมนูสำเร็จ`, 'success');
            } else {
                document.getElementById('menuGrid').innerHTML =
                    '<p style="text-align:center; padding:20px; color:#999;">ไม่มีข้อมูลเมนูในฐานข้อมูล</p>';
                showNotification('⚠️ ไม่พบข้อมูลเมนูในระบบ', 'error');
            }
        } else {
            showNotification('❌ โหลดเมนูไม่สำเร็จ: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading permissions:', error);
        showNotification('❌ เกิดข้อผิดพลาดในการโหลดเมนู: ' + error.message, 'error');
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
                <button class="btn-action btn-edit" onclick="editRole(${role.role_id}, '${role.role_name}')">Edit</button>
            </div>
        `;
        positionsList.appendChild(div);
    });

    console.log('✅ Displayed', roles.length, 'roles');
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
             ${perm.permission_name}</span>
        `;
        div.addEventListener('click', () => togglePermission(div));
        menuGrid.appendChild(div);
    });

    console.log('✅ Displayed', permissions.length, 'menu items');
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
            showNotification(`✅ โหลดสิทธิ์สำเร็จ (${result.count} เมนู)`, 'success');
        } else {
            showNotification('❌ โหลดสิทธิ์ไม่สำเร็จ: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading role permissions:', error);
        showNotification('❌ เกิดข้อผิดพลาดในการโหลดสิทธิ์: ' + error.message, 'error');
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
        showNotification('⚠️ กรุณาเลือก Role ก่อน', 'error');
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
            showNotification(`✅ บันทึกสิทธิ์สำเร็จ (${result.permissions_count} เมนู)`, 'success');
            originalPermissions = [...permissions];
        } else {
            showNotification('❌ บันทึกไม่สำเร็จ: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving permissions:', error);
        showNotification('❌ เกิดข้อผิดพลาดในการบันทึก: ' + error.message, 'error');
    }
}

// ยกเลิกการแก้ไข
function resetPermissions() {
    if (currentRoleId) {
        updateMenuDisplay(originalPermissions);
        showNotification('↩️ ยกเลิกการแก้ไขแล้ว', 'success');
    } else {
        showNotification('⚠️ กรุณาเลือก Role ก่อน', 'error');
    }
}

// Edit role (placeholder function)
function editRole(roleId, roleName) {
    showNotification(`✏️ กำลังแก้ไข Role: ${roleName} (ID: ${roleId})`, 'success');
    // สามารถเพิ่มฟังก์ชันแก้ไขชื่อ role ได้ที่นี่
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
    console.log('🚀 Page loaded, loading initial data...');
    console.log('📍 API URL:', API_URL);

    // แสดง loading indicator
    showNotification('⏳ กำลังโหลดข้อมูล...', 'success');

    // โหลดข้อมูลแบบ async
    Promise.all([loadRoles(), loadPermissions()]).then(() => {
        console.log('✅ All data loaded successfully');
    }).catch(error => {
        console.error('❌ Error loading data:', error);
        showNotification('❌ เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    });
});