const API_BASE = "src/api/";
let selectedRoom = null;
let searchCriteria = null;

// เมื่อโหลดหน้า
document.addEventListener("DOMContentLoaded", function () {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("date").value = today;
    document.getElementById("date").min = today;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(Math.ceil(now.getMinutes() / 30) * 30).padStart(2, "0");
    document.getElementById("start_time").value = `${hours}:${minutes}`;
    document.getElementById("end_time").value = `${String((now.getHours() + 1) % 24).padStart(2, "0")}:${minutes}`;

    displayInitialMessage();
});


//ค้นหาห้องประชุม ดึงจาก API
async function searchRooms() {
    const date = document.getElementById("date").value;
    const startTime = document.getElementById("start_time").value;
    const endTime = document.getElementById("end_time").value;
    const capacity = parseInt(document.getElementById("capacity").value) || 1;


    if (!date || !startTime || !endTime) {
        showAlert("กรุณากรอกข้อมูลให้ครบถ้วน", "error");
        return;
    }
    if (startTime >= endTime) {
        showAlert("เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด", "error");
        return;
    }

    searchCriteria = { date, startTime, endTime, capacity };

    try {
        // ดึงการจองทั้งหมดของวันนั้นจาก API
        const bookings = await fetchBookings(date);

        // ดึงข้อมูลห้องที่รองรับจำนวนผู้เข้าร่วม
        const rooms = await fetchRooms(capacity);
        // ตรวจสอบห้องว่าง
        const availableRooms = rooms.map(room => {
            const isBooked = bookings.some(b => {
                const overlap = b.room_id == room.room_id &&
                    timeOverlap(startTime, endTime, b.start_time, b.end_time);
                if (overlap) {
                    console.log(`❌ ห้อง ${room.room_name} ถูกจอง:`, b);
                }
                return overlap;
            });
            return { ...room, isAvailable: !isBooked };
        });

        displayRooms(availableRooms);
        const availableCount = availableRooms.filter(r => r.isAvailable).length;
        if (availableCount > 0) {
            showAlert(`พบห้องว่าง ${availableCount} ห้อง (จากทั้งหมด ${rooms.length} ห้องที่รองรับ ${capacity} คน)`, "success");
        } else if (rooms.length > 0) {
            showAlert(`มีห้องที่รองรับ ${capacity} คน แต่ถูกจองหมดในช่วงเวลานี้`, "warning");
        } else {
            showAlert(`ไม่มีห้องที่รองรับ ${capacity} คน`, "error");
        }
    } catch (error) {
        console.error('❗ Error:', error);
        showAlert("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + error.message, "error");
    }
}

// ตรวจสอบเวลาทับซ้อน
function timeOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
}

// ดึงข้อมูลจาก API
async function fetchRooms(capacity = 0) {
    const url = `${API_BASE}getRooms.php?capacity=${capacity}`;

    const res = await fetch(url, {
        credentials: "include",
    });
    const json = await res.json();

    if (json.status !== "success") throw new Error(json.message);
    return json.data;
}

// ดึงการจองจาก backend
async function fetchBookings(date) {
    const res = await fetch(`${API_BASE}getBookings.php?date=${date}`, {
        credentials: "include",
    });
    const json = await res.json();
    if (json.status !== "success") throw new Error(json.message);
    return json.data;
}

// บันทึกการจองใหม่
async function createBooking(data) {
    const res = await fetch(`${API_BASE}createBooking.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    const json = await res.json();
    return json;
}

// UI ส่วนแสดงผล
function displayRooms(roomList) {
    const grid = document.getElementById("roomsGrid");
    if (roomList.length === 0) {
        displayNoRooms();
        return;
    }
    grid.innerHTML = roomList
        .map(
            (room) => `
        <div class="room-card">
            <div class="room-title">${room.room_name}</div>
            <div class="room-cap">ความจุ: ${room.capacity} คน • ${room.floor_number}</div>
            <div style="font-size: 12px; color: #95a5a6; margin-bottom: 12px;">
                ${(room.facilities || []).join(" • ")}
            </div>
            <div class="room-status">
                <div class="status-badge">
                    <span class="chip ${room.isAvailable ? "available" : "booked"}"></span>
                    <span>${room.isAvailable ? "ห้องว่าง" : "ถูกจอง"}</span>
                </div>
                ${room.isAvailable
                    ? `<button class="btn" onclick="selectRoom(${room.room_id})">เลือกห้อง</button>`
                    : `<button class="btn" disabled>ไม่ว่าง</button>`
                }
            </div>
        </div>`
        )
        .join("");
}

function displayNoRooms() {
    document.getElementById("roomsGrid").innerHTML = `
        <div class="empty-state">
            <div style="font-size: 64px; opacity: 0.3;">😔</div>
            <p>ไม่พบห้องว่างในช่วงเวลาที่เลือก</p>
        </div>
    `;
}

function displayInitialMessage() {
    document.getElementById("roomsGrid").innerHTML = `
        <div class="empty-state">
            <div style="font-size: 64px; opacity: 0.3;">📅</div>
            <p>กรุณาเลือกวันที่และเวลาเพื่อค้นหาห้องว่าง</p>
        </div>
    `;
}

// Modal และการจอง
function selectRoom(roomId) {
    fetchRooms(searchCriteria.capacity).then((rooms) => {
        selectedRoom = rooms.find((r) => r.room_id === roomId);
        if (!selectedRoom || !searchCriteria) {
            showAlert("เกิดข้อผิดพลาด กรุณาลองใหม่", "error");
            return;
        }

        document.getElementById("modalRoomInfo").textContent =
            `${selectedRoom.room_name} | ${searchCriteria.date} | ${searchCriteria.startTime} - ${searchCriteria.endTime}`;
        document.getElementById("meeting_title").value = "";
        document.getElementById("meeting_description").value = "";
        document.getElementById("bookingModal").classList.add("active");
    });
}

function closeModal() {
    document.getElementById("bookingModal").classList.remove("active");
    selectedRoom = null;
}

async function confirmBooking() {
    const title = document.getElementById("meeting_title").value.trim();
    const desc = document.getElementById("meeting_description").value.trim();

    if (!title) {
        showAlert("กรุณาระบุหัวข้อการประชุม", "error");
        return;
    }

    if (!selectedRoom || !searchCriteria) {
        showAlert("ข้อมูลห้องประชุมไม่ครบ กรุณาเลือกใหม่", "error");
        return;
    }

    const newBooking = {
        room_id: selectedRoom.room_id,
        booking_date: searchCriteria.date,
        start_time: searchCriteria.startTime,
        end_time: searchCriteria.endTime,
        purpose: title,
        attendees_count: searchCriteria.capacity,
        table_layout: 1,
        description: desc,
    };

    try {
        // ✅ เรียก API
        const result = await createBooking(newBooking);

        if (result.success) {
            showAlert("จองห้องสำเร็จ!", "success");
            closeModal();
            resetSearch();
        } else {
            showAlert(result.message || "เกิดข้อผิดพลาดในการจอง", "error");
        }
    } catch (err) {
        console.error("❌ Booking error:", err);
        showAlert("เกิดข้อผิดพลาดในการจองห้อง: " + err.message, "error");
    }
}


// ฟังก์ชันล้างค่า
function resetSearch() {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("date").value = today;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(Math.ceil(now.getMinutes() / 30) * 30).padStart(2, "0");
    document.getElementById("start_time").value = `${hours}:${minutes}`;
    document.getElementById("end_time").value = `${String((now.getHours() + 1) % 24).padStart(2, "0")}:${minutes}`;
    document.getElementById("capacity").value = "1";

    displayInitialMessage();
    searchCriteria = null;
}

//  ระบบแจ้งเตือน

function showAlert(message, type) {
    const alertBox = document.getElementById("alertBox");
    alertBox.textContent = message;
    alertBox.className = `alert ${type} active`;
    setTimeout(() => hideAlert(), 4000);
}

function hideAlert() {
    document.getElementById("alertBox").classList.remove("active");
}

// ปิด modal เมื่อคลิกนอกกล่อง
document.addEventListener("click", function (e) {
    const modal = document.getElementById("bookingModal");
    if (e.target === modal) closeModal();
});