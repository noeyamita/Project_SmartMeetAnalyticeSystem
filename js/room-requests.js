document.addEventListener("DOMContentLoaded", loadRequests);

async function loadRequests() {
  const container = document.getElementById("requestsContainer");
  try {
    const res = await fetch("src/api/getPendingRequests.php");
    const result = await res.json();

    if (result.status === "success") {
      if (result.data.length === 0) {
        container.innerHTML =
          '<div class="empty-state"><i class="fa-solid fa-inbox"></i> ไม่มีคำขอรอดำเนินการ</div>';
        return;
      }

      let html = "";
      result.data.forEach((req) => {
        const startTime = req.start_time.substring(0, 5);
        const endTime = req.end_time.substring(0, 5);
        const ownersHtml =
          req.current_owners.length > 0
            ? `<div class="req-owner"><i class="fa-solid fa-user-clock"></i> ผู้ที่ใช้ห้องนี้อยู่เดิม: ${req.current_owners.join(", ")}</div>`
            : `<div class="req-owner" style="background:#ecfdf5; color:#10b981;"><i class="fa-solid fa-circle-check"></i> ห้องนี้ว่างแล้ว (ผู้จองเดิมอาจยกเลิกไป)</div>`;

        html += `
                    <div class="request-card">
                        <div class="req-info">
                            <h4><i class="fa-solid fa-user-tie"></i> ผู้ขอ: ${req.fname} ${req.lname} (Executive)</h4>
                            <div class="req-detail"><i class="fa-solid fa-door-open"></i> <strong>ห้อง:</strong> ${req.room_name}</div>
                            <div class="req-detail"><i class="fa-solid fa-calendar-day"></i> <strong>วัน/เวลา:</strong> ${req.booking_date} | ${startTime} - ${endTime}</div>
                            <div class="req-detail"><i class="fa-solid fa-comment-dots"></i> <strong>เหตุผล:</strong> ${req.purpose} (${req.attendees_count} คน)</div>
                            ${ownersHtml}
                        </div>
                        <div class="req-actions">
                            <button class="btn primary" style="background: #10b981;" onclick="manageRequest(${req.booking_id}, 'approve')">
                                <i class="fa-solid fa-check"></i> อนุมัติ
                            </button>
                            <button class="btn danger" style="background: #ef4444;" onclick="manageRequest(${req.booking_id}, 'reject')">
                                <i class="fa-solid fa-xmark"></i> ปฏิเสธ
                            </button>
                        </div>
                    </div>
                `;
      });
      container.innerHTML = html;
    }
  } catch (e) {
    container.innerHTML =
      '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i> เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
  }
}

async function manageRequest(bookingId, action) {
  if (
    !confirm(
      `คุณต้องการ ${action === "approve" ? "อนุมัติ" : "ปฏิเสธ"} คำขอนี้ใช่หรือไม่?`,
    )
  )
    return;

  try {
    const res = await fetch("src/api/manageRequest.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, action: action }),
    });
    const result = await res.json();

    if (result.status === "success") {
      alert(result.message);
      if (
        action === "approve" &&
        result.displaced_bookings &&
        result.displaced_bookings.length > 0
      ) {
        displacedBookingsQueue = result.displaced_bookings;
        processNextDisplacedBooking();
      } else {
        loadRequests();
      }
    } else {
      alert("Error: " + result.message);
    }
  } catch (e) {
    alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
  }
}

let displacedBookingsQueue = [];
let currentDisplacedBookingId = null;
let selectedAltRoomId = null;

async function processNextDisplacedBooking() {
  if (displacedBookingsQueue.length === 0) {
    loadRequests();
    return;
  }

  const booking = displacedBookingsQueue.shift();
  currentDisplacedBookingId = booking.booking_id;
  selectedAltRoomId = null;

  document.getElementById("altRoomModal").classList.add("active");
  document.getElementById("altRoomList").innerHTML =
    '<div class="loading"><i class="fa-solid fa-spinner fa-spin"></i> กำลังค้นหาห้องว่าง...</div>';
  document.getElementById("confirmMoveBtn").disabled = true;

  try {
    const response = await fetch(
      `src/api/getAlternativeRooms.php?booking_id=${booking.booking_id}`,
    );
    const result = await response.json();

    if (result.status === "success" && result.data.length > 0) {
      let html = `<div style="margin-bottom: 15px; padding: 10px; background: #fffbeb; border-radius: 8px;">
                            <strong style="color:#d97706;"><i class="fa-solid fa-circle-info"></i> ต้องการหาห้องแทนให้เจ้าของเดิม (ID: ${booking.booking_id})</strong><br>
                            <i class="fa-solid fa-users-viewfinder"></i> รองรับผู้เข้าร่วมเดิม: ${booking.attendees_count} คน
                        </div>`;
      html +=
        '<div class="equipment-list" style="display:flex; flex-direction:column; gap:10px;">';
      result.data.forEach((room) => {
        html += `
                <div style="padding:10px; border:1px solid #ddd; border-radius:6px; display: flex; align-items: center; gap: 10px;">
                    <input type="radio" name="alt_room" value="${room.room_id}" id="alt_room_${room.room_id}" onchange="selectAltRoom(${room.room_id})">
                    <label for="alt_room_${room.room_id}" style="cursor: pointer; flex-grow: 1;">
                        <i class="fa-solid fa-door-closed"></i> <strong>${room.room_name}</strong>
                        <span style="font-size:13px; color:#666; margin-left:10px;"><i class="fa-solid fa-people-group"></i> จุได้ ${room.capacity} คน, ชั้น ${room.floor_number || "-"}</span>
                    </label>
                </div>`;
      });
      html += "</div>";
      document.getElementById("altRoomList").innerHTML = html;
    } else {
      document.getElementById("altRoomList").innerHTML =
        '<div class="empty-state" style="color:#ef4444;"><i class="fa-solid fa-circle-exclamation"></i> ไม่พบห้องว่างอื่นๆ ที่รองรับคนกลุ่มนี้ได้แล้ว</div>';
    }
  } catch (e) {
    document.getElementById("altRoomList").innerHTML =
      '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i> เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
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
    const response = await fetch("src/api/moveBooking.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: currentDisplacedBookingId,
        new_room_id: selectedAltRoomId,
      }),
    });
    const result = await response.json();

    if (result.status === "success") {
      alert("ย้ายเจ้าของเดิมไปยังห้องใหม่ พร้อมอุปกรณ์เดิมสำเร็จ!");
    } else {
      alert("ย้ายห้องไม่สำเร็จ: " + result.message);
    }
  } catch (e) {
    alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
  }

  confirmBtn.innerHTML =
    '<i class="fa-solid fa-check"></i> ยืนยันการย้ายไปห้องนี้';
  document.getElementById("altRoomModal").classList.remove("active");

  setTimeout(processNextDisplacedBooking, 500);
}

async function skipMoveRoom() {
  if (!currentDisplacedBookingId) {
    document.getElementById("altRoomModal").classList.remove("active");
    setTimeout(processNextDisplacedBooking, 500);
    return;
  }

  const confirm = window.confirm(
    "ไม่เลือกห้องทดแทน? การจองของผู้ใช้จะถูกยกเลิกและคืนอุปกรณ์ทันที",
  );
  if (!confirm) return;

  try {
    const response = await fetch("src/api/adminCancelBooking.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: currentDisplacedBookingId }),
    });
    const result = await response.json();
    if (result.status === "success") {
      alert("ยกเลิกการจองและคืนอุปกรณ์สำเร็จ ผู้ใช้จะได้รับแจ้งเตือน");
    } else {
      alert("เกิดข้อผิดพลาด: " + result.message);
    }
  } catch (e) {
    alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
  }

  document.getElementById("altRoomModal").classList.remove("active");
  setTimeout(processNextDisplacedBooking, 500);
}
