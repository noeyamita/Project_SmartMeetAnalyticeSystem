const API_BASE = "../src/api/";
let monthlyChart = null;
let refreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard loaded');

    // โหลดข้อมูลเริ่มต้น
    loadUserDashboard();

    // ตั้งค่า Auto-refresh ทุก 30 วินาที
    startAutoRefresh();
});

// ฟังก์ชันแสดง Alert
function showAlert(message, type = 'error', duration = 3000) {
    const alertBox = document.getElementById('alertBox');
    alertBox.textContent = message;
    alertBox.className = `alert ${type} active`;
    setTimeout(() => {
        alertBox.className = 'alert';
    }, duration);
}

// สลับ Tab
function switchTab(tab) {
    const userTab = document.getElementById('userTab');
    const adminTab = document.getElementById('adminTab');
    const userTabBtn = document.getElementById('userTabBtn');
    const adminTabBtn = document.getElementById('adminTabBtn');

    if (tab === 'user') {
        userTab.classList.add('active');
        adminTab.classList.remove('active');
        userTabBtn.classList.add('active');
        adminTabBtn.classList.remove('active');

        loadUserDashboard();
    } else {
        adminTab.classList.add('active');
        userTab.classList.remove('active');
        adminTabBtn.classList.add('active');
        userTabBtn.classList.remove('active');

        loadAdminDashboard();
    }
}

// เริ่ม Auto-refresh
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    refreshInterval = setInterval(() => {
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'userTab') {
            loadRoomStatus();
        } else if (activeTab && activeTab.id === 'adminTab') {
            loadAdminStats();
        }
    }, 30000); // 30 วินาที
}

// ===================================
// USER DASHBOARD
// ===================================

async function loadUserDashboard() {
    console.log('📊 Loading User Dashboard...');

    await Promise.all([
        loadRoomStatus(),
        loadUserStats(),
        loadUpcomingBookings(),
        loadUserPopularRooms()
    ]);
}

// 1. โหลดสถานะห้องแบบ Real-time
async function loadRoomStatus() {
    try {
        const response = await fetch(`${API_BASE}getRoomStatus.php`);
        const result = await response.json();

        const container = document.getElementById('roomsStatusGrid');

        if (result.status === 'success' && result.data.length > 0) {
            container.innerHTML = result.data.map(room => {
                const statusClass = room.status === 'available' ? 'available' :
                    room.status === 'occupied' ? 'occupied' : 'reserved';
                const statusText = room.status === 'available' ? 'ว่าง' :
                    room.status === 'occupied' ? 'กำลังใช้งาน' : 'จองแล้ว';

                return `
                    <div class="room-status-card ${statusClass}">
                        <div class="room-status-header">
                            <div class="status-indicator ${statusClass}"></div>
                            <div class="room-status-name">${room.room_name}</div>
                        </div>
                        <div class="room-status-info">
                            ความจุ: ${room.capacity} คน<br>
                            ชั้น: ${room.floor_number || '-'}
                        </div>
                        <span class="room-status-label ${statusClass}">${statusText}</span>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<div class="empty-state"><p>ไม่พบข้อมูลห้องประชุม</p></div>';
        }
    } catch (error) {
        console.error('Error loading room status:', error);
        document.getElementById('roomsStatusGrid').innerHTML =
            '<div class="empty-state"><p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p></div>';
    }
}

// 2. โหลดสถิติผู้ใช้
async function loadUserStats() {
    try {
        const response = await fetch(`${API_BASE}getUserStats.php`);
        const result = await response.json();

        if (result.status === 'success') {
            document.getElementById('userTotalBookings').textContent =
                result.data.total_bookings || 0;
            document.getElementById('userCompletedBookings').textContent =
                result.data.completed_bookings || 0;
            document.getElementById('userCancelledBookings').textContent =
                result.data.cancelled_bookings || 0;
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

// 3. โหลดการจองที่กำลังจะมาถึง
async function loadUpcomingBookings() {
    try {
        const response = await fetch(`${API_BASE}getUpcomingBookings.php`);
        const result = await response.json();

        const container = document.getElementById('upcomingBookingsList');

        if (result.status === 'success' && result.data.length > 0) {
            container.innerHTML = result.data.map(booking => `
                <div class="upcoming-booking-item">
                    <div class="booking-time">${booking.start_time} - ${booking.end_time}</div>
                    <div class="booking-room">${booking.room_name}</div>
                    <div class="booking-date">${booking.booking_date_thai}</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state"><p>ไม่มีการจองที่กำลังจะมาถึง</p></div>';
        }
    } catch (error) {
        console.error('Error loading upcoming bookings:', error);
        document.getElementById('upcomingBookingsList').innerHTML =
            '<div class="empty-state"><p>เกิดข้อผิดพลาด</p></div>';
    }
}

// 4. โหลดห้องที่ผู้ใช้จองบ่อยที่สุด
async function loadUserPopularRooms() {
    try {
        const response = await fetch(`${API_BASE}getUserPopularRooms.php`);
        const result = await response.json();

        const container = document.getElementById('userPopularRoomsList');

        if (result.status === 'success' && result.data.length > 0) {
            const maxCount = result.data[0].booking_count;

            container.innerHTML = result.data.map((room, index) => {
                const percentage = (room.booking_count / maxCount) * 100;

                return `
                    <div class="popular-room-item">
                        <div class="room-rank">${index + 1}</div>
                        <div class="room-info">
                            <div class="room-name">${room.room_name}</div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                        <div class="room-count">${room.booking_count} ครั้ง</div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<div class="empty-state"><p>ยังไม่มีข้อมูลการจอง</p></div>';
        }
    } catch (error) {
        console.error('Error loading user popular rooms:', error);
        document.getElementById('userPopularRoomsList').innerHTML =
            '<div class="empty-state"><p>เกิดข้อผิดพลาด</p></div>';
    }
}

// ===================================
// ADMIN DASHBOARD
// ===================================

async function loadAdminDashboard() {
    console.log('👨‍💼 Loading Admin Dashboard...');

    await Promise.all([
        loadAdminStats(),
        loadPeakTimes(),
        loadMonthlyChart(),
        loadAdminPopularRooms()
    ]);
}

// 1. โหลดสถิติ Admin
async function loadAdminStats() {
    try {
        const response = await fetch(`${API_BASE}getAdminStats.php`);
        const result = await response.json();

        if (result.status === 'success') {
            document.getElementById('todayBookings').textContent =
                result.data.today_bookings || 0;
            document.getElementById('weekBookings').textContent =
                result.data.week_bookings || 0;
            document.getElementById('monthBookings').textContent =
                result.data.month_bookings || 0;
            document.getElementById('cancelledBookings').textContent =
                result.data.cancelled_bookings || 0;
            document.getElementById('roomChanges').textContent =
                result.data.room_changes || 0;
        }
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

// 2. โหลดเวลาที่มีการจองมากที่สุด
async function loadPeakTimes() {
    try {
        const response = await fetch(`${API_BASE}getPeakTimes.php`);
        const result = await response.json();

        const container = document.getElementById('peakTimesList');

        if (result.status === 'success' && result.data.length > 0) {
            container.innerHTML = result.data.map(time => `
                <div class="peak-time-item">
                    <div class="peak-time-label">${time.time_range}</div>
                    <div class="peak-time-count">${time.booking_count}</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state"><p>ไม่มีข้อมูล</p></div>';
        }
    } catch (error) {
        console.error('Error loading peak times:', error);
        document.getElementById('peakTimesList').innerHTML =
            '<div class="empty-state"><p>เกิดข้อผิดพลาด</p></div>';
    }
}

// 3. โหลดกราฟรายเดือน
async function loadMonthlyChart() {
    try {
        const response = await fetch(`${API_BASE}getMonthlyBookings.php`);
        const result = await response.json();

        if (result.status === 'success' && result.data.length > 0) {
            renderMonthlyChart(result.data);
        }
    } catch (error) {
        console.error('Error loading monthly chart:', error);
    }
}

function renderMonthlyChart(data) {
    const ctx = document.getElementById('monthlyChart');

    if (!ctx) return;

    // ลบ chart เดิม
    if (monthlyChart) {
        monthlyChart.destroy();
    }

    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => `วันที่ ${d.day}`),
            datasets: [{
                label: 'จำนวนการจอง',
                data: data.map(d => d.booking_count),
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// 4. โหลดห้องที่ได้รับความนิยมสูงสุด (Admin)
async function loadAdminPopularRooms() {
    try {
        const response = await fetch(`${API_BASE}getAdminPopularRooms.php`);
        const result = await response.json();

        const container = document.getElementById('adminPopularRoomsList');

        if (result.status === 'success' && result.data.length > 0) {
            const maxCount = result.data[0].booking_count;

            container.innerHTML = result.data.map((room, index) => {
                const percentage = (room.booking_count / maxCount) * 100;

                return `
                    <div class="popular-room-item">
                        <div class="room-rank">${index + 1}</div>
                        <div class="room-info">
                            <div class="room-name">${room.room_name}</div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                        <div class="room-count">${room.booking_count} ครั้ง</div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<div class="empty-state"><p>ไม่มีข้อมูล</p></div>';
        }
    } catch (error) {
        console.error('Error loading admin popular rooms:', error);
        document.getElementById('adminPopularRoomsList').innerHTML =
            '<div class="empty-state"><p>เกิดข้อผิดพลาด</p></div>';
    }
}

// Cleanup เมื่อออกจากหน้า
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    if (monthlyChart) {
        monthlyChart.destroy();
    }
});