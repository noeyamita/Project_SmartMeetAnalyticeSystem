const API_BASE = "src/api/";
const API_USERS = API_BASE + "getUsersBan.php";
const API_UPDATE = API_BASE + "updateBanStatus.php";

let allUsers = [];
let currentFilter = 'all';
let pendingAction = null;
async function init() {
    await fetchUsers();
    renderTable();
    updateStats();
}

async function fetchUsers() {
    try {
        const res = await fetch(API_USERS);
        const data = await res.json();
        if (data.success) allUsers = data.users;
    } catch (e) {
        console.error('fetchUsers error', e);
        showToast('โหลดข้อมูลไม่สำเร็จ', 'error');
    }
}

const roleConfig = {
    'Admin': { cls: 'admin', icon: 'fa-crown' },
    'Executive': { cls: 'executive', icon: 'fa-briefcase' },
    'Normal': { cls: 'normal', icon: 'fa-user' },
    'new': { cls: 'new', icon: 'fa-user-plus' },
};

function renderTable() {
    const q = document.getElementById('searchInput').value.toLowerCase().trim();
    const tbody = document.getElementById('userTableBody');

    let users = allUsers.filter(u => {
        const name = `${u.fname} ${u.lname}`.toLowerCase();
        const email = (u.email ?? '').toLowerCase();
        const matchSearch = !q || name.includes(q) || email.includes(q);
        const matchFilter =
            currentFilter === 'all' ||
            (currentFilter === 'banned' && u.is_banned == 1) ||
            (currentFilter === 'active' && u.is_banned != 1);
        return matchSearch && matchFilter;
    });

    document.getElementById('resultCount').textContent =
        users.length ? `แสดง ${users.length} รายการ` : '';

    if (!users.length) {
        tbody.innerHTML = `
            <tr><td colspan="5" class="empty-row">
                <i class="fas fa-users-slash"></i>
                ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข
            </td></tr>`;
        return;
    }

    tbody.innerHTML = users.map(u => {
        const initials = (u.fname?.[0] ?? '') + (u.lname?.[0] ?? '');
        const isBanned = u.is_banned == 1;
        const roleName = u.role_name || 'ไม่ระบุ';
        const roleInfo = roleConfig[roleName] ?? { cls: 'normal', icon: 'fa-circle' };

        return `
        <tr class="${isBanned ? 'is-banned' : ''}">
            <td>
                <div class="user-cell">
                    <div class="user-avatar ${isBanned ? 'banned-avatar' : ''}">${initials}</div>
                    <div>
                        <div class="user-full-name">${u.fname} ${u.lname}</div>
                        <div class="user-id-label">#${u.user_id}</div>
                    </div>
                </div>
            </td>
            <td><span class="email-cell">${u.email ?? '-'}</span></td>
            <td>
                <span class="role-badge ${roleInfo.cls}">
                    <i class="fas ${roleInfo.icon}"></i> ${roleName}
                </span>
            </td>
            <td>
                <span class="status-badge ${isBanned ? 'status-banned' : 'status-active'}">
                    <span class="status-dot"></span>
                    ${isBanned ? 'ถูกแบน' : 'ปกติ'}
                </span>
            </td>
            <td>
                <div class="action-cell">
                    ${isBanned
                ? `<button class="action-btn unban-btn" onclick="openModal(${u.user_id}, false)">
                               <i class="fas fa-lock-open"></i> ปลดแบน
                           </button>`
                : `<button class="action-btn ban-btn" onclick="openModal(${u.user_id}, true)">
                               <i class="fas fa-ban"></i> แบน
                           </button>`
            }
                </div>
            </td>
        </tr>`;
    }).join('');
}

function updateStats() {
    const banned = allUsers.filter(u => u.is_banned == 1).length;
    const active = allUsers.length - banned;
    document.getElementById('statBanned').textContent = banned;
    document.getElementById('statActive').textContent = active;
}

function setFilter(filter, el) {
    currentFilter = filter;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    renderTable();
}

// ค้นหา
document.getElementById('searchInput').addEventListener('input', function () {
    document.getElementById('clearBtn').style.display = this.value ? 'block' : 'none';
    renderTable();
});

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('clearBtn').style.display = 'none';
    renderTable();
}

function openModal(userId, isBan) {
    const user = allUsers.find(u => u.user_id == userId);
    if (!user) return;

    pendingAction = { userId, isBan };

    const overlay = document.getElementById('modalOverlay');
    const icon = document.getElementById('modalIcon');
    const title = document.getElementById('modalTitle');
    const desc = document.getElementById('modalDesc');
    const reasonWrap = document.getElementById('modalReasonWrap');
    const confirmBtn = document.getElementById('modalConfirmBtn');

    if (isBan) {
        icon.className = 'modal-icon ban-icon';
        icon.innerHTML = '<i class="fas fa-ban"></i>';
        title.textContent = `แบน ${user.fname} ${user.lname}`;
        desc.innerHTML = `ผู้ใช้จะ<strong style="color:#f87171"> ไม่สามารถเข้าสู่ระบบได้</strong> และจะได้รับแจ้งเตือนเมื่อพยายาม Login`;
        reasonWrap.style.display = 'block';
        document.getElementById('banReason').value = '';
        confirmBtn.textContent = 'ยืนยันการแบน';
        confirmBtn.className = 'modal-btn confirm ban';
    } else {
        icon.className = 'modal-icon unban-icon';
        icon.innerHTML = '<i class="fas fa-lock-open"></i>';
        title.textContent = `ปลดแบน ${user.fname} ${user.lname}`;
        desc.textContent = 'ผู้ใช้จะสามารถเข้าสู่ระบบได้ตามปกติ';
        reasonWrap.style.display = 'none';
        confirmBtn.textContent = 'ยืนยันการปลดแบน';
        confirmBtn.className = 'modal-btn confirm unban';
    }

    overlay.classList.add('open');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    pendingAction = null;
}

// Close on backdrop click
document.getElementById('modalOverlay').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
});

// ยืนยันการแบน/ปลดแบน
async function confirmAction() {
    if (!pendingAction) return;

    const { userId, isBan } = pendingAction;
    const reason = isBan ? document.getElementById('banReason').value.trim() : '';

    closeModal();

    try {
        const res = await fetch(API_UPDATE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                is_banned: isBan ? 1 : 0,
                reason: reason
            })
        });
        const data = await res.json();

        if (data.success) {
            allUsers = allUsers.map(u => {
                if (u.user_id == userId) {
                    return { ...u, is_banned: isBan ? 1 : 0 };
                }
                return u;
            });
            renderTable();
            updateStats();
            showToast(
                isBan ? 'แบนผู้ใช้เรียบร้อยแล้ว' : 'ปลดแบนผู้ใช้เรียบร้อยแล้ว',
                'success'
            );
        } else {
            showToast('เกิดข้อผิดพลาด: ' + (data.message ?? 'ไม่ทราบสาเหตุ'), 'error');
        }
    } catch (e) {
        showToast('ไม่สามารถเชื่อมต่อ server ได้', 'error');
    }
}

let toastTimer = null;

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (toastTimer) clearTimeout(toastTimer);
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'circle-check' : 'circle-exclamation'}"></i> ${msg}`;
    toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3500);
}

init();