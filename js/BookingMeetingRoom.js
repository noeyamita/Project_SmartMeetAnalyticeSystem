const API_BASE = "src/api/";
let searchCriteria = null;
let availableRooms = [];
let selectedRoom = null;

function getMaxAdvanceDaysByRole() {
  switch (window.USER_ROLE) {
    case "admin":
      return null;
    case "executive":
      return 30;
    case "normal":
    default:
      return 14;
  }
}

function isWithinRoleAdvanceLimit(bookingDate) {
  const maxDays = getMaxAdvanceDaysByRole();
  if (maxDays === null) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const booking = new Date(bookingDate + "T00:00:00");
  const diffDays = (booking - today) / (1000 * 60 * 60 * 24);
  return diffDays <= maxDays;
}

function isValidTime(timeString) {
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(timeString);
}

function timeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

function isNotPastTime(date, time) {
  const now = new Date();
  const bookingDateTime = new Date(date + "T" + time + ":00");
  return bookingDateTime > now;
}

function isBookingAtLeast3HoursInAdvance(date, time) {
  const now = new Date();
  const bookingDateTime = new Date(date + "T" + time + ":00");
  const diffHours = (bookingDateTime - now) / (1000 * 60 * 60);
  return diffHours >= 3;
}

function isTimeInRange(userStart, userEnd, roomStart, roomEnd) {
  const uStart = userStart.replace(":", "");
  const uEnd = userEnd.replace(":", "");
  const rStart = roomStart.replace(":", "");
  const rEnd = roomEnd.replace(":", "");
  return uStart >= rStart && uEnd <= rEnd;
}

function showAlert(message, type = "error", duration = 4000) {
  const alertBox = document.getElementById("alertBox");
  alertBox.textContent = message;
  alertBox.className = `alert ${type} active`;
  alertBox.style.position = "fixed";
  alertBox.style.top = "20px";
  alertBox.style.left = "50%";
  alertBox.style.transform = "translateX(-50%)";
  alertBox.style.zIndex = "9999";
  alertBox.style.minWidth = "300px";
  alertBox.style.textAlign = "center";
  setTimeout(() => {
    alertBox.className = "alert";
  }, duration);
}

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().split("T")[0];
  const dateInput = document.getElementById("date");
  if (dateInput) dateInput.value = today;

  const qStart = sessionStorage.getItem("quickBook_start");
  const qEnd = sessionStorage.getItem("quickBook_end");
  const qRoomId = sessionStorage.getItem("quickBook_room_id");

  if (qStart && qEnd) {
    document.getElementById("start_time").value = qStart;
    document.getElementById("end_time").value = qEnd;
    sessionStorage.removeItem("quickBook_start");
    sessionStorage.removeItem("quickBook_end");
    sessionStorage.removeItem("quickBook_room_id");

    setTimeout(async () => {
      await searchRooms();
      if (qRoomId) {
        // หาห้องที่ตรงกับที่กดจองทันที แล้วเปิด modal ให้ทันที
        const targetRoom = availableRooms.find(
          (r) => String(r.room_id) === String(qRoomId),
        );
        if (targetRoom && targetRoom.availability_status === "available") {
          openBookingModal(targetRoom.room_id, false);
        }
      }
    }, 500);
  }

  fetchEquipments();
  fetchTableLayouts();
});
async function fetchEquipments() {
  try {
    const response = await fetch("src/api/getEquipments.php");
    const result = await response.json();
    const box = document.getElementById("equipmentOptions");
    if (!box) return;
    box.innerHTML = "";

    if (result.status === "success") {
      result.data.forEach((e) => {
        box.innerHTML += `
                <div class="equipment-item">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" name="equipment_id" value="${e.equipment_id}">
                        <span>${e.equipment_name}</span>
                    </label>
                </div>`;
      });
    }
  } catch (err) {
    console.error(err);
    showAlert("โหลดอุปกรณ์ไม่สำเร็จ");
  }
}

async function fetchTableLayouts() {
  try {
    const response = await fetch("src/api/getTableLayouts.php");
    const result = await response.json();
    const box = document.getElementById("tableLayoutOptions");
    if (!box) return;
    box.innerHTML = "";

    if (result.status === "success") {
      result.data.forEach((l, i) => {
        box.innerHTML += `
                <div class="layout-item">
                    <input type="radio" name="table_layout_id" value="${l.tablelayout_id}" id="layout_${l.tablelayout_id}" ${i === 0 ? "checked" : ""}>
                    <label for="layout_${l.tablelayout_id}" style="cursor: pointer; margin-left: 5px;">
                        ${l.tablelayout_name}
                    </label>
                </div>`;
      });
    }
  } catch {
    showAlert("โหลดรูปแบบโต๊ะไม่สำเร็จ");
  }
}

async function searchRooms() {
  const date = document.getElementById("date").value;
  const start = document.getElementById("start_time").value;
  const end = document.getElementById("end_time").value;
  const cap = document.getElementById("capacity").value;

  if (!date || !start || !end) {
    showAlert("กรุณากรอกข้อมูลให้ครบ");
    return;
  }

  if (!isValidTime(start) || !isValidTime(end)) {
    showAlert("รูปแบบเวลาไม่ถูกต้อง");
    return;
  }

  if (timeToMinutes(start) >= timeToMinutes(end)) {
    showAlert("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");
    return;
  }

  if (timeToMinutes(end) - timeToMinutes(start) < 30) {
    showAlert("ระยะเวลาจองต้องไม่ต่ำกว่า 30 นาที");
    return;
  }

  if (!isNotPastTime(date, start)) {
    showAlert("ไม่สามารถจองเวลาที่ผ่านมาแล้ว");
    return;
  }

  if (!isBookingAtLeast3HoursInAdvance(date, start)) {
    showAlert("ต้องจองล่วงหน้าอย่างน้อย 3 ชั่วโมง", "warning");
    return;
  }

  if (!isWithinRoleAdvanceLimit(date)) {
    let msg = "วันที่เกินสิทธิ์การจองของคุณ";
    const role = (
      sessionStorage.getItem("userRole") ||
      window.USER_ROLE ||
      "normal"
    ).toLowerCase();
    if (role === "executive") msg = "Executive จองล่วงหน้าได้ไม่เกิน 1 เดือน";
    if (role === "normal") msg = "ผู้ใช้ทั่วไปจองล่วงหน้าได้ไม่เกิน 2 สัปดาห์";
    showAlert(msg, "warning", 6000);
    return;
  }

  const roomsGrid = document.getElementById("roomsGrid");
  roomsGrid.innerHTML =
    '<div class="loading"><i class="fa-solid fa-spinner fa-spin"></i> กำลังค้นหาห้องว่าง...</div>';

  try {
    const url = `../src/api/getRooms.php?capacity=${cap}&date=${date}&start_time=${start}&end_time=${end}`;
    const response = await fetch(url);
    const result = await response.json();
    availableRooms = result.data || [];
    renderRooms(availableRooms);
  } catch (e) {
    showAlert("เกิดข้อผิดพลาดในการค้นหาห้อง");
    roomsGrid.innerHTML = "";
  }
}

function resetSearch() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("date").value = today;
  document.getElementById("start_time").value = "";
  document.getElementById("end_time").value = "";
  document.getElementById("capacity").value = "";
  availableRooms = [];
  selectedRoom = null;
  renderRooms([]);
  const inputs = document.querySelectorAll(
    'input[name="equipment_id"], input[name="table_layout_id"]',
  );
  inputs.forEach((input) => (input.checked = false));
}

async function confirmBooking() {
  if (!selectedRoom) {
    showAlert("กรุณาเลือกห้อง");
    return;
  }

  const date = document.getElementById("date").value;
  const start = document.getElementById("start_time").value;

  if (!isWithinRoleAdvanceLimit(date)) {
    showAlert("วันที่เลือกเกินสิทธิ์การจองของคุณ", "warning");
    return;
  }

  const confirmBtn = document.querySelector(".modal-footer .btn.primary");
  const originalText = confirmBtn.innerHTML;
  confirmBtn.disabled = true;
  confirmBtn.innerHTML =
    '<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังดำเนินการ...';

  // ตรวจสอบจำนวนคน
  const modalAttendees = document.getElementById("modal_attendees");
  const attendeesCount = parseInt(modalAttendees?.value) || 1;
  if (selectedRoom?.capacity && attendeesCount > selectedRoom.capacity) {
    showAlert(
      `จำนวนผู้เข้าร่วมเกินความจุห้อง (สูงสุด ${selectedRoom.capacity} คน)`,
      "error",
    );
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = originalText;
    return;
  }

  const bookingData = {
    room_id: selectedRoom.room_id,
    booking_date: date,
    start_time: start,
    end_time: document.getElementById("end_time").value,
    capacity: attendeesCount,
    purpose: document.getElementById("meeting_title").value,
    table_layout_id: parseInt(
      document.querySelector('input[name="table_layout_id"]:checked')?.value ||
        0,
    ),
    equipments: Array.from(
      document.querySelectorAll('input[name="equipment_id"]:checked'),
    ).map((e) => parseInt(e.value)),
  };

  try {
    const response = await fetch("../src/api/createBooking.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingData),
    });

    const result = await response.json();

    if (result.status === "success") {
      showAlert(result.message, "success", 8000);
      closeModal();
      searchRooms();

      if (result.displaced_bookings && result.displaced_bookings.length > 0) {
        displacedBookingsQueue = result.displaced_bookings;
        processNextDisplacedBooking();
      }
    } else {
      showAlert(result.message);
    }
  } catch (err) {
    showAlert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = originalText;
  }
}

function renderRooms(rooms) {
  const grid = document.getElementById("roomsGrid");
  const userStart = document.getElementById("start_time").value;
  const userEnd = document.getElementById("end_time").value;
  const role = (
    sessionStorage.getItem("userRole") ||
    window.USER_ROLE ||
    "normal"
  ).toLowerCase();

  grid.innerHTML = "";
  let hasRoom = false;

  if (!rooms || rooms.length === 0) {
    grid.innerHTML =
      '<div class="empty-state"><i class="fa-solid fa-calendar-xmark"></i> ไม่พบห้องประชุม</div>';
    return;
  }

  rooms.forEach((room) => {
    if (room.status == 3) return;

    if (!isTimeInRange(userStart, userEnd, room.open_time, room.close_time))
      return;
    hasRoom = true;

    let isAvailable = room.availability_status === "available";
    let chipClass = isAvailable
      ? "available"
      : room.availability_status || "booked";
    let statusText =
      room.availability_text || (isAvailable ? "ว่าง" : "ไม่ว่าง");
    let btnHtml = "";

    if (room.status == 2) {
      chipClass = "unavailable";
      statusText = "ปิดปรับปรุง";
      btnHtml = `<button class="btn" style="background-color: #cbd5e1; color: #64748b; cursor: not-allowed;" disabled><i class="fa-solid fa-ban"></i> ปิดปรับปรุง</button>`;
    } else {
      if (isAvailable) {
        btnHtml = `<button class="btn primary" onclick="openBookingModal(${room.room_id}, false)"><i class="fa-solid fa-check"></i> เลือกห้อง</button>`;
      } else {
        if (role === "executive") {
          btnHtml = `<button class="btn warning" style="background:#f59e0b; color:#fff;" onclick="openBookingModal(${room.room_id}, true)"><i class="fa-solid fa-code-pull-request"></i> ขอใช้แทน</button>`;
        } else if (role === "admin") {
          btnHtml = `<button class="btn danger" style="background:#ef4444; color:#fff;" onclick="openBookingModal(${room.room_id}, true)"><i class="fa-solid fa-layer-group"></i> จองทับ</button>`;
        } else {
          btnHtml = `<button class="btn primary" disabled><i class="fa-solid fa-lock"></i> ไม่ว่าง</button>`;
        }
      }
    }

    const img =
      room.image_url && room.image_url.trim()
        ? room.image_url
        : "uploads/rooms/default_room.jpg";

    grid.innerHTML += `
            <div class="room-card ${room.status == 2 ? "unavailable" : isAvailable ? "available" : "unavailable"}">
                <div class="room-image" style="background-image: url('${img}');"></div>
                <div class="room-details">
                    <div class="room-title">${room.room_name}</div>
                    <div class="operating-hours"><i class="fa-regular fa-clock"></i> ${room.open_time.substring(0, 5)} - ${room.close_time.substring(0, 5)}</div>
                    <div class="room-cap">
                        <i class="fa-solid fa-users"></i> ความจุ ${room.capacity} คน<br>
                        <i class="fa-solid fa-layer-group"></i> ชั้น ${room.floor_number || "-"} | <i class="fa-solid fa-maximize"></i> ${room.room_size || "N/A"}
                    </div>
                    <div class="room-status">
                        <div class="status-badge"><span class="chip ${chipClass}"></span> ${statusText}</div>
                        ${btnHtml}
                    </div>
                </div>
            </div>
        `;
  });

  if (!hasRoom)
    grid.innerHTML =
      '<div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i> ไม่มีห้องว่างในช่วงเวลานี้</div>';
}

function openBookingModal(roomId, isOverride = false) {
  selectedRoom = availableRooms.find((r) => r.room_id == roomId);

  // ดึงจำนวนคนจาก search form มาใส่ใน modal เป็นค่าเริ่มต้น
  const capacityInput = document.getElementById("capacity");
  const modalAttendees = document.getElementById("modal_attendees");
  if (modalAttendees && capacityInput) {
    modalAttendees.value = capacityInput.value || 1;
    // กำหนด max ตามความจุห้อง
    if (selectedRoom && selectedRoom.capacity) {
      modalAttendees.max = selectedRoom.capacity;
    }
  }

  document.getElementById("bookingModal").classList.add("active");
  const modalTitle = document.querySelector(".modal-header h3");
  const currentUserRole = (
    sessionStorage.getItem("userRole") || "normal"
  ).toLowerCase();

  if (isOverride) {
    if (currentUserRole === "admin") {
      modalTitle.innerHTML =
        '<i class="fa-solid fa-triangle-exclamation"></i> ยืนยันการจองทับ (สิทธิ์ Admin)';
      modalTitle.style.color = "#ef4444";
    } else {
      modalTitle.innerHTML =
        '<i class="fa-solid fa-paper-plane"></i> ส่งคำขอใช้ห้องแทน (สิทธิ์ Executive)';
      modalTitle.style.color = "#f59e0b";
    }
  } else {
    modalTitle.innerHTML =
      '<i class="fa-solid fa-calendar-check"></i> ยืนยันการจองห้องประชุม';
    modalTitle.style.color = "#2c3e50";
  }
}

function closeModal() {
  document.getElementById("bookingModal").classList.remove("active");
  selectedRoom = null;
}

let displacedBookingsQueue = [];
let currentDisplacedBookingId = null;
let selectedAltRoomId = null;

async function processNextDisplacedBooking() {
  if (displacedBookingsQueue.length === 0) return;

  const booking = displacedBookingsQueue.shift();
  currentDisplacedBookingId = booking.booking_id;
  selectedAltRoomId = null;

  document.getElementById("altRoomModal").classList.add("active");
  document.getElementById("altRoomList").innerHTML =
    '<div class="loading"><i class="fa-solid fa-spinner fa-spin"></i> กำลังค้นหาห้องว่าง...</div>';
  document.getElementById("confirmMoveBtn").disabled = true;

  try {
    const response = await fetch(
      `../src/api/getAlternativeRooms.php?booking_id=${booking.booking_id}`,
    );
    const result = await response.json();

    if (result.status === "success" && result.data.length > 0) {
      let html = `<div style="margin-bottom: 15px; padding: 15px; background: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b;">
                            <strong style="color:#d97706;"><i class="fa-solid fa-circle-info"></i> ต้องการหาห้องแทนให้ (ID: ${booking.booking_id})</strong><br>
                            <span style="font-size: 0.9rem;"><i class="fa-solid fa-people-group"></i> รองรับผู้เข้าร่วมเดิม: ${booking.attendees_count} คน</span>
                        </div>`;
      html +=
        '<div class="equipment-list" style="display: flex; flex-direction: column; gap: 10px;">';
      result.data.forEach((room) => {
        html += `
                <div class="layout-item" style="border: 1px solid #eee; padding: 10px; border-radius: 8px; display: flex; align-items: center; gap: 12px;">
                    <input type="radio" name="alt_room" value="${room.room_id}" id="alt_room_${room.room_id}" onchange="selectAltRoom(${room.room_id})">
                    <label for="alt_room_${room.room_id}" style="cursor: pointer; display: flex; flex-direction: column;">
                        <strong style="color: #4a5568;"><i class="fa-solid fa-door-open"></i> ${room.room_name}</strong>
                        <span style="font-size: 12px; color: #718096;">(จุได้ ${room.capacity} คน, ชั้น ${room.floor_number || "-"})</span>
                    </label>
                </div>`;
      });
      html += "</div>";
      document.getElementById("altRoomList").innerHTML = html;
    } else {
      document.getElementById("altRoomList").innerHTML =
        '<div class="empty-state" style="color: #e53e3e;"><i class="fa-solid fa-triangle-exclamation"></i> ไม่พบห้องว่างอื่นๆ ที่เหมาะสม</div>';
    }
  } catch (e) {
    document.getElementById("altRoomList").innerHTML =
      '<div class="empty-state">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
  }
}

function selectAltRoom(roomId) {
  selectedAltRoomId = roomId;
  document.getElementById("confirmMoveBtn").disabled = false;
}

async function confirmMoveRoom() {
  if (!selectedAltRoomId) return;
  const confirmBtn = document.getElementById("confirmMoveBtn");
  confirmBtn.disabled = true;
  confirmBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> กำลังย้ายห้อง...';

  try {
    const response = await fetch("../src/api/moveBooking.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: currentDisplacedBookingId,
        new_room_id: selectedAltRoomId,
      }),
    });
    const result = await response.json();

    if (result.status === "success") {
      showAlert("ย้ายการจองไปยังห้องใหม่ พร้อมอุปกรณ์เดิมสำเร็จ!", "success");
    } else {
      showAlert("ย้ายห้องไม่สำเร็จ: " + result.message);
    }
  } catch (e) {
    showAlert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
  }

  confirmBtn.innerHTML =
    '<i class="fa-solid fa-check"></i> ยืนยันการย้ายไปห้องนี้';
  document.getElementById("altRoomModal").classList.remove("active");
  searchRooms();
  if (displacedBookingsQueue.length > 0) {
    setTimeout(processNextDisplacedBooking, 500);
  }
}

function skipMoveRoom() {
  document.getElementById("altRoomModal").classList.remove("active");
  if (displacedBookingsQueue.length > 0) {
    setTimeout(processNextDisplacedBooking, 500);
  }
}
