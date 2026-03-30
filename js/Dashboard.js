const API_BASE = "../src/api/";
let monthlyChart = null;
let donutChart = null;
let refreshInterval = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Dashboard loaded");
  const roleName = sessionStorage.getItem("userRole") || "";
  const roleId = parseInt(sessionStorage.getItem("roleId") || "0");
  const adminTabBtn = document.getElementById("adminTabBtn");

  const isAdminOrExecutive =
    roleId === 1 ||
    roleId === 2 ||
    roleName === "Admin" ||
    roleName === "Executive";

  if (!isAdminOrExecutive && adminTabBtn) {
    adminTabBtn.style.display = "none";
  }
  loadUserDashboard();
  startAutoRefresh();
});

function showAlert(message, type = "error", duration = 3000) {
  const alertBox = document.getElementById("alertBox");
  alertBox.textContent = message;
  alertBox.className = `alert ${type} active`;
  setTimeout(() => {
    alertBox.className = "alert";
  }, duration);
}

function switchTab(tab) {
  const userTab = document.getElementById("userTab");
  const adminTab = document.getElementById("adminTab");
  const userTabBtn = document.getElementById("userTabBtn");
  const adminTabBtn = document.getElementById("adminTabBtn");

  if (tab === "user") {
    userTab.classList.add("active");
    adminTab.classList.remove("active");
    userTabBtn.classList.add("active");
    adminTabBtn.classList.remove("active");
    loadUserDashboard();
  } else {
    adminTab.classList.add("active");
    userTab.classList.remove("active");
    adminTabBtn.classList.add("active");
    userTabBtn.classList.remove("active");
    loadAdminDashboard();
  }
}

function startAutoRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    const activeTab = document.querySelector(".tab-content.active");
    if (activeTab && activeTab.id === "userTab") {
      loadRoomStatus();
    } else if (activeTab && activeTab.id === "adminTab") {
      loadAdminStats();
    }
  }, 30000);
}

// USER DASHBOARD
async function loadUserDashboard() {
  await Promise.all([
    loadRoomStatus(),
    loadUserStats(),
    loadUpcomingBookings(),
    loadUserPopularRooms(),
  ]);
}

async function loadRoomStatus() {
  try {
    const response = await fetch(`${API_BASE}getQuickBookRooms.php`);
    const result = await response.json();
    const container = document.getElementById("roomsStatusGrid");
    const cardHeader = container.parentElement.querySelector(".card-header h2");

    if (cardHeader) {
      // เปลี่ยน Emoji 🟢 เป็น Icon fa-signal (หรือ fa-bolt สำหรับ Quick Book)
      cardHeader.innerHTML =
        '<i class="fa-solid fa-bolt"></i> จองห้องประชุมในรายการโปรด';
    }

    if (result.status === "success" && result.data.length > 0) {
      container.innerHTML = result.data
        .map((room) => {
          const isAvailable = room.status === "available";
          const statusClass = isAvailable ? "available" : "occupied";
          const statusText = isAvailable ? "ว่างพร้อมจอง" : "ไม่ว่าง";

          return `
                    <div class="room-status-card ${statusClass}">
                        <div class="room-status-header">
                            <div class="status-indicator ${statusClass}"></div>
                            <div class="room-status-name">${room.room_name}</div>
                        </div>
                        <div class="room-status-info" style="margin-bottom: 12px; font-weight: 500;">
                            <i class="fa-regular fa-clock"></i> เช็คเวลา: ${room.start_time} - ${room.end_time}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="room-status-label ${statusClass}">${statusText}</span>
                            
                            ${
                              isAvailable
                                ? `
                                <button class="btn primary" 
                                    style="padding: 6px 12px; font-size: 13px;" 
                                    onclick="quickBookRoom('${room.room_id}', '${room.start_time}', '${room.end_time}')">
                                    <i class="fa-solid fa-plus"></i> จองทันที
                                </button>
                            `
                                : ""
                            }
                        </div>
                    </div>
                `;
        })
        .join("");
    } else {
      container.innerHTML =
        '<div class="empty-state"><i class="fa-solid fa-inbox"></i> ไม่พบข้อมูลห้องประชุม</div>';
    }
  } catch (error) {
    document.getElementById("roomsStatusGrid").innerHTML =
      '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i> เกิดข้อผิดพลาด</div>';
  }
}

function quickBookRoom(roomId, startTime, endTime) {
  sessionStorage.setItem("quickBook_room_id", roomId);
  sessionStorage.setItem("quickBook_start", startTime);
  sessionStorage.setItem("quickBook_end", endTime);
  window.location.href = "BookingMeetingRoom.html";
}

async function loadUserStats() {
  try {
    const response = await fetch(`${API_BASE}getUserStats.php`);
    const result = await response.json();
    if (result.status === "success") {
      document.getElementById("userTotalBookings").textContent =
        result.data.total_bookings || 0;
      document.getElementById("userCompletedBookings").textContent =
        result.data.completed_bookings || 0;
      document.getElementById("userCancelledBookings").textContent =
        result.data.cancelled_bookings || 0;
    }
  } catch (error) {}
}

async function loadUpcomingBookings() {
  try {
    const response = await fetch(`${API_BASE}getUpcomingBookings.php`);
    const result = await response.json();
    const container = document.getElementById("upcomingBookingsList");

    if (result.status === "success" && result.data.length > 0) {
      container.innerHTML = result.data
        .map(
          (booking) => `
                <div class="upcoming-booking-item">
                    <div class="room-rank"><i class="fa-solid fa-calendar-day" style="color: #667eea;"></i></div>
                    <div class="room-info">
                        <div class="booking-room">${booking.room_name}</div>
                        <div class="booking-date">${booking.booking_date_thai}</div>
                    </div>
                    <div class="booking-time">${booking.start_time} - ${booking.end_time}</div>
                </div>
            `,
        )
        .join("");
    } else {
      container.innerHTML =
        '<div class="empty-state"><i class="fa-solid fa-calendar-xmark"></i> ไม่มีรายการจอง</div>';
    }
  } catch (error) {
    document.getElementById("upcomingBookingsList").innerHTML =
      '<div class="empty-state">เกิดข้อผิดพลาด</div>';
  }
}

async function loadUserPopularRooms() {
  try {
    const response = await fetch(`${API_BASE}getUserPopularRooms.php`);
    const result = await response.json();
    const container = document.getElementById("userPopularRoomsList");

    if (result.status === "success" && result.data.length > 0) {
      const maxCount = result.data[0].booking_count;
      container.innerHTML = result.data
        .map((room, index) => {
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
                        <div class="room-count">${room.booking_count} <span style="font-size:12px; color:#8b95a5;">ครั้ง</span></div>
                    </div>
                `;
        })
        .join("");
    } else {
      container.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูล</div>';
    }
  } catch (error) {
    document.getElementById("userPopularRoomsList").innerHTML =
      '<div class="empty-state">เกิดข้อผิดพลาด</div>';
  }
}

// ADMIN DASHBOARD
async function loadAdminDashboard() {
  await Promise.all([
    loadAdminStats(),
    loadPeakTimes(),
    loadMonthlyChart(),
    loadAdminPopularRooms(),
  ]);
}

async function loadAdminStats() {
  try {
    const response = await fetch(`${API_BASE}getAdminStats.php`);
    const result = await response.json();

    if (result.status === "success") {
      document.getElementById("todayBookings").textContent =
        result.data.today_bookings || 0;
      document.getElementById("weekBookings").textContent =
        result.data.week_bookings || 0;

      const monthTotal = parseInt(result.data.month_bookings) || 0;
      const cancelledTotal = parseInt(result.data.cancelled_bookings) || 0;
      const completedTotal = Math.max(0, monthTotal - cancelledTotal);

      document.getElementById("monthBookings").textContent = monthTotal;
      document.getElementById("cancelledBookings").textContent = cancelledTotal;
      document.getElementById("roomChanges").textContent =
        result.data.room_changes || 0;

      renderDonutChart(completedTotal, cancelledTotal);
    }
  } catch (error) {}
}

async function loadPeakTimes() {
  try {
    const response = await fetch(`${API_BASE}getPeakTimes.php`);
    const result = await response.json();
    const container = document.getElementById("peakTimesList");

    if (result.status === "success" && result.data.length > 0) {
      container.innerHTML = result.data
        .map(
          (time, index) => `
                <div class="peak-time-item">
                    <div class="room-rank">${index + 1}</div>
                    <div class="room-info">
                        <div class="peak-time-label" style="font-weight: 600; color: #344767;">
                            <i class="fa-regular fa-clock" style="margin-right: 5px; font-size: 12px;"></i> ${time.time_range}
                        </div>
                    </div>
                    <div class="peak-time-count">
                        ${time.booking_count} <span style="font-size:12px; color:#8b95a5; font-weight: normal;">ครั้ง</span>
                    </div>
                </div>
            `,
        )
        .join("");
    } else {
      container.innerHTML = '<div class="empty-state">ไม่มีข้อมูล</div>';
    }
  } catch (error) {
    console.error("Error loading peak times:", error);
    document.getElementById("peakTimesList").innerHTML =
      '<div class="empty-state">เกิดข้อผิดพลาด</div>';
  }
}

async function loadAdminPopularRooms() {
  try {
    const response = await fetch(`${API_BASE}getAdminPopularRooms.php`);
    const result = await response.json();
    const container = document.getElementById("adminPopularRoomsList");

    if (result.status === "success" && result.data.length > 0) {
      const maxCount = result.data[0].booking_count;
      container.innerHTML = result.data
        .map((room, index) => {
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
                        <div class="room-count">${room.booking_count} <span style="font-size:12px; color:#8b95a5;">ครั้ง</span></div>
                    </div>
                `;
        })
        .join("");
    } else {
      container.innerHTML = '<div class="empty-state">ไม่มีข้อมูล</div>';
    }
  } catch (error) {}
}

async function loadMonthlyChart() {
  try {
    const response = await fetch(`${API_BASE}getMonthlyBookings.php`);
    const result = await response.json();
    if (result.status === "success" && result.data.length > 0) {
      renderMonthlyChart(result.data);
    }
  } catch (error) {}
}

function renderMonthlyChart(data) {
  const ctx = document.getElementById("monthlyChart").getContext("2d");
  if (!ctx) return;
  if (monthlyChart) monthlyChart.destroy();

  let gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, "rgba(102, 126, 234, 0.4)");
  gradient.addColorStop(1, "rgba(102, 126, 234, 0.0)");

  monthlyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map((d) => `วันที่ ${d.day}`),
      datasets: [
        {
          label: "จำนวนการจอง",
          data: data.map((d) => d.booking_count),
          borderColor: "#667eea",
          backgroundColor: gradient,
          borderWidth: 3,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#667eea",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { borderDash: [5, 5], color: "#edf2f9" },
          border: { display: false },
        },
        x: { grid: { display: false }, border: { display: false } },
      },
      interaction: { intersect: false, mode: "index" },
    },
  });
}

function renderDonutChart(completed, cancelled) {
  const ctx = document.getElementById("statusDonutChart").getContext("2d");
  if (!ctx) return;
  if (donutChart) donutChart.destroy();
  const hasData = completed > 0 || cancelled > 0;

  donutChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["เสร็จสมบูรณ์", "ยกเลิก"],
      datasets: [
        {
          data: hasData ? [completed, cancelled] : [1, 0],
          backgroundColor: hasData
            ? ["#10b981", "#ef4444"]
            : ["#e1e8ed", "#e1e8ed"],
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "75%",
      plugins: {
        legend: {
          position: "right",
          labels: {
            usePointStyle: true,
            padding: 20,
            font: { family: "'Segoe UI', sans-serif", size: 13 },
          },
        },
        tooltip: {
          enabled: hasData,
        },
      },
    },
  });
}

window.addEventListener("beforeunload", () => {
  if (refreshInterval) clearInterval(refreshInterval);
  if (monthlyChart) monthlyChart.destroy();
  if (donutChart) donutChart.destroy();
});
