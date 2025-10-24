// User role simulation (change to 'user' to test user view)
let userRole = 'admin'; // 'admin' or 'user'

const menuItems = [
    {
        id: 'booking',
        icon: '📅',
        text: 'จองห้องประชุม',
        page: 'bookingPage',
        roles: ['admin', 'user']
    },
    {
        id: 'dashboard',
        icon: '📊',
        text: 'Dashboard',
        page: 'dashboardPage',
        roles: ['admin']
    },
    {
        id: 'roomManagement',
        icon: '🏢',
        text: 'จัดการห้อง',
        page: 'roomManagementPage',
        roles: ['admin']
    },
    {
        id: 'profile',
        icon: '👤',
        text: 'Profile',
        page: 'profilePage',
        roles: ['admin', 'user']
    }
];

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

function initializeApp() {
    // Set user info
    document.getElementById('userName').textContent = userRole === 'admin' ? 'Admin User' : 'Regular User';
    document.getElementById('userBadge').textContent = userRole === 'admin' ? 'Admin' : 'User';
    document.getElementById('userBadge').className = `badge ${userRole}`;

    // Generate menu
    generateMenu();

    // Set today's date
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('date').value = today;

    // Add role toggle button for demo (remove in production)
    addDemoRoleToggle();
}

function generateMenu() {
    const menuContainer = document.getElementById('sidebarMenu');
    menuContainer.innerHTML = '';

    menuItems.forEach(item => {
        if (item.roles.includes(userRole)) {
            const menuItem = document.createElement('a');
            menuItem.className = 'menu-item' + (item.id === 'booking' ? ' active' : '');
            menuItem.onclick = () => navigateTo(item.page, menuItem);
            menuItem.innerHTML = `
                <span class="menu-item-icon">${item.icon}</span>
                <span class="menu-item-text">${item.text}</span>
            `;
            menuContainer.appendChild(menuItem);
        }
    });
}

function navigateTo(pageId, menuElement) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    document.getElementById(pageId).classList.add('active');

    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    menuElement.classList.add('active');

    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

function searchRooms() {
    const date = document.getElementById('date').value;
    const startTime = document.getElementById('start_time').value;
    const endTime = document.getElementById('end_time').value;
    const participants = document.getElementById('participants').value;

    if (!date || !startTime || !endTime) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
    }

    if (startTime >= endTime) {
        alert('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด');
        return;
    }

    console.log('Searching rooms with:', {
        date,
        startTime,
        endTime,
        participants
    });

    alert('กำลังค้นหาห้องว่าง...');
    // Here you can add your API call to search for rooms
}

function resetSearch() {
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('date').value = today;
    document.getElementById('start_time').value = '';
    document.getElementById('end_time').value = '';
    document.getElementById('participants').value = 1;
}

function logout() {
    if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
        // Clear session/localStorage if needed
        console.log('Logging out...');
        window.location.href = 'login.html';
    }
}

// Toggle role for demo (remove in production)
function toggleRole() {
    userRole = userRole === 'admin' ? 'user' : 'admin';
    initializeApp();

    // Navigate back to booking page after role change
    const bookingMenuItem = document.querySelector('.menu-item');
    if (bookingMenuItem) {
        navigateTo('bookingPage', bookingMenuItem);
    }
}

// Add role toggle button for demo (remove in production)
function addDemoRoleToggle() {
    // Check if button already exists
    if (document.getElementById('demoRoleToggle')) {
        return;
    }

    const roleToggle = document.createElement('button');
    roleToggle.id = 'demoRoleToggle';
    roleToggle.textContent = 'Toggle Role (Demo)';
    roleToggle.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 16px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        z-index: 9999;
        font-size: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        transition: all 0.2s;
    `;
    roleToggle.onmouseover = function () {
        this.style.transform = 'scale(1.05)';
    };
    roleToggle.onmouseout = function () {
        this.style.transform = 'scale(1)';
    };
    roleToggle.onclick = toggleRole;
    document.body.appendChild(roleToggle);
}