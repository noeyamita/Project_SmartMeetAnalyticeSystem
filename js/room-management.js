const API_URL = "../src/api/room-management.php";
let Meeting_Rooms = [];
let statuses = [];
let isEditing = false;
let displacedBookingsQueue = [];
let currentDisplacedBookingId = null;
let selectedAltRoomId = null;

const roomForm = document.getElementById("roomForm");
const roomTableBody = document.getElementById("roomTableBody");
const searchInput = document.getElementById("searchInput");
const loadingOverlay = document.getElementById("loadingOverlay");
const toast = document.getElementById("toast");
const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const cancelBtn = document.getElementById("cancelBtn");
const imageFile = document.getElementById("imageFile");
const imagePreview = document.getElementById("imagePreview");

document.addEventListener("DOMContentLoaded", () => {
  loadStatuses();
  loadRooms();
  setupEventListeners();
});

function setupEventListeners() {
  roomForm.addEventListener("submit", handleSubmit);
  cancelBtn.addEventListener("click", resetForm);
  searchInput.addEventListener("input", handleSearch);
  imageFile.addEventListener("change", handleImagePreview);
}

function showLoading() {
  loadingOverlay.classList.add("show");
}
function hideLoading() {
  loadingOverlay.classList.remove("show");
}

function showToast(message, type = "success") {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

async function loadStatuses() {
  try {
    const response = await fetch(`${API_URL}?action=getStatus`);
    const data = await response.json();
    if (data.success) {
      statuses = data.data;
      populateStatusDropdown();
    }
  } catch (error) {
    console.error("Error loading statuses:", error);
  }
}

function populateStatusDropdown() {
  const statusSelect = document.getElementById("status");
  statusSelect.innerHTML = statuses
    .map(
      (status) =>
        `<option value="${status.roomstatus_id}">${status.roomstatus_name}</option>`,
    )
    .join("");
}

function handleImagePreview(e) {
  const file = e.target.files[0];
  if (!file) {
    imagePreview.innerHTML = "";
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showToast("ขนาดไฟล์ต้องไม่เกิน 2MB", "error");
    e.target.value = "";
    imagePreview.innerHTML = "";
    return;
  }
  if (!file.type.startsWith("image/")) {
    showToast("กรุณาเลือกไฟล์รูปภาพเท่านั้น", "error");
    e.target.value = "";
    imagePreview.innerHTML = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (event) {
    imagePreview.innerHTML = `
            <img src="${event.target.result}" alt="Preview">
            <button type="button" class="remove-image" onclick="removeImage()">
                <i class="fa-solid fa-trash-can"></i> ลบรูปภาพ
            </button>
        `;
  };
  reader.readAsDataURL(file);
}

function removeImage() {
  imageFile.value = "";
  imagePreview.innerHTML = "";
}

async function loadRooms() {
  showLoading();
  try {
    const response = await fetch(`${API_URL}?action=getAll`);
    const data = await response.json();
    if (data.success) {
      Meeting_Rooms = data.data;
      displayRooms(Meeting_Rooms);
    } else {
      showToast(data.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล", "error");
    }
  } catch (error) {
    console.error("Error:", error);
    showToast("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์", "error");
  } finally {
    hideLoading();
  }
}

function displayRooms(roomList) {
  if (roomList.length === 0) {
    roomTableBody.innerHTML =
      '<tr><td colspan="9" class="text-center">ไม่พบข้อมูลห้องประชุม</td></tr>';
    return;
  }

  roomTableBody.innerHTML = roomList
    .map((room) => {
      const statusInfo = statuses.find((s) => s.roomstatus_id == room.status);
      const statusName = statusInfo
        ? statusInfo.roomstatus_name
        : "ไม่ทราบสถานะ";
      const statusClass =
        room.status == 1 ? "status-available" : "status-unavailable";
      const imageCell = room.image_url
        ? `<img src="${room.image_url}" alt="${room.room_name}" class="room-image" onclick="viewImage('${room.image_url}')">`
        : "-";

      return `
        <tr>
            <td>${room.room_id}</td>
            <td>${imageCell}</td>
            <td>${room.room_name}</td>
            <td>${room.capacity}</td>
            <td>${room.room_size}</td>
            <td>${room.floor_number}</td>
            <td><span class="status-badge ${statusClass}">${statusName}</span></td>
            <td>${room.open_time} - ${room.close_time}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editRoom(${room.room_id})">
                        <i class="fa-solid fa-pen-to-square"></i> แก้ไข
                    </button>
                    <button class="btn-delete" onclick="deleteRoom(${room.room_id})">
                        <i class="fa-solid fa-trash"></i> ลบ
                    </button>
                </div>
            </td>
        </tr>
        `;
    })
    .join("");
}

function viewImage(imageUrl) {
  window.open(imageUrl, "_blank");
}

function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  const filteredRooms = Meeting_Rooms.filter(
    (room) =>
      room.room_name.toLowerCase().includes(searchTerm) ||
      room.floor_number.toLowerCase().includes(searchTerm) ||
      room.capacity.toString().includes(searchTerm),
  );
  displayRooms(filteredRooms);
}

async function handleSubmit(e) {
  e.preventDefault();
  const formData = new FormData();
  formData.append("action", isEditing ? "update" : "create");
  formData.append("room_name", document.getElementById("roomName").value);
  formData.append(
    "capacity",
    parseInt(document.getElementById("capacity").value),
  );
  formData.append(
    "room_size",
    parseFloat(document.getElementById("roomSize").value),
  );
  formData.append("floor_number", document.getElementById("floorNumber").value);
  formData.append("status", parseInt(document.getElementById("status").value));
  formData.append("open_time", document.getElementById("openTime").value);
  formData.append("close_time", document.getElementById("closeTime").value);
  formData.append(
    "description",
    document.getElementById("description").value || "",
  );

  const imageFileInput = document.getElementById("imageFile");
  if (imageFileInput.files.length > 0) {
    formData.append("image", imageFileInput.files[0]);
  }

  if (isEditing) {
    formData.append(
      "room_id",
      parseInt(document.getElementById("roomId").value),
    );
    await updateRoom(formData);
  } else {
    await createRoom(formData);
  }
}

async function createRoom(formData) {
  showLoading();
  try {
    const response = await fetch(API_URL, { method: "POST", body: formData });
    const result = await response.json();
    if (result.success) {
      showToast("เพิ่มห้องประชุมสำเร็จ", "success");
      resetForm();
      loadRooms();
    } else {
      showToast(result.message || "เกิดข้อผิดพลาดในการเพิ่มข้อมูล", "error");
    }
  } catch (error) {
    console.error("Error:", error);
    showToast("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์", "error");
  } finally {
    hideLoading();
  }
}

function editRoom(roomId) {
  const room = Meeting_Rooms.find((r) => r.room_id === roomId);
  if (!room) return;

  isEditing = true;
  formTitle.textContent = "แก้ไขข้อมูลห้องประชุม";
  submitBtn.innerHTML =
    '<i class="fa-solid fa-floppy-disk"></i> บันทึกการแก้ไข';

  document.getElementById("roomId").value = room.room_id;
  document.getElementById("roomName").value = room.room_name;
  document.getElementById("capacity").value = room.capacity;
  document.getElementById("roomSize").value = room.room_size;
  document.getElementById("floorNumber").value = room.floor_number;
  document.getElementById("status").value = room.status;
  document.getElementById("openTime").value = room.open_time;
  document.getElementById("closeTime").value = room.close_time;
  document.getElementById("description").value = room.description || "";

  if (room.image_url) {
    imagePreview.innerHTML = `
            <img src="${room.image_url}" alt="Current Image">
            <button type="button" class="remove-image" onclick="removeImage()">
                <i class="fa-solid fa-trash-can"></i> ลบรูปภาพ
            </button>
        `;
  } else {
    imagePreview.innerHTML = "";
  }
  document
    .querySelector(".form-section")
    .scrollIntoView({ behavior: "smooth" });
}

async function deleteRoom(roomId) {
  if (!confirm("คุณต้องการลบห้องประชุมนี้หรือไม่?")) return;

  showLoading();
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", room_id: roomId }),
    });
    const result = await response.json();
    if (result.success) {
      showToast("ลบข้อมูลสำเร็จ", "success");
      loadRooms();
    } else {
      showToast(result.message || "เกิดข้อผิดพลาดในการลบข้อมูล", "error");
    }
  } catch (error) {
    console.error("Error:", error);
    showToast("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์", "error");
  } finally {
    hideLoading();
  }
}

function resetForm() {
  isEditing = false;
  roomForm.reset();
  document.getElementById("roomId").value = "";
  formTitle.textContent = "เพิ่มห้องประชุมใหม่";
  submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึก';
  imagePreview.innerHTML = "";
}

async function updateRoom(formData) {
  showLoading();
  try {
    const response = await fetch(API_URL, { method: "POST", body: formData });
    const result = await response.json();

    if (result.success || result.status === "success") {
      showToast("อัปเดตสถานะห้องลงฐานข้อมูลสำเร็จ", "success");
      resetForm();
      loadRooms();

      const roomId = formData.get("room_id");
      const newStatus = parseInt(formData.get("status"));

      console.log(`ห้อง ${roomId} ถูกเปลี่ยนเป็นสถานะ: ${newStatus}`);

      if (newStatus !== 1) {
        checkAffectedBookings(roomId);
      }
    } else {
      showToast(result.message || "เกิดข้อผิดพลาดในการแก้ไขข้อมูล", "error");
    }
  } catch (error) {
    console.error("Error:", error);
    showToast("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์", "error");
  } finally {
    hideLoading();
  }
}

async function checkAffectedBookings(roomId) {
  alert("มีห้องประชุมที่มีการจองได้รับผลกระทบนี้! (กำลังเรียก PHP)");
  try {
    const res = await fetch(
      `../src/api/handleAffectedBookings.php?room_id=${roomId}`,
    );
    const result = await res.json();
    console.log("ข้อมูลที่ PHP ตอบกลับมา:", result);
    if (result.status === "success") {
      if (result.data && result.data.length > 0) {
        const confirmProcess = confirm(
          `พบการจอง ${result.data.length} รายการได้รับผลกระทบ!\nระบบเตรียมห้องทดแทนไว้แล้ว ต้องการย้ายห้องให้ทันทีหรือไม่?`,
        );
        if (confirmProcess) {
          displacedBookingsQueue = result.data;
          processNextDisplacedBooking();
        }
      } else {
        showToast("ไม่มีคนจองค้างอยู่ ปลอดภัย!", "success");
      }
    } else {
      alert("PHP แจ้ง Error กลับมาว่า: " + result.message);
    }
  } catch (e) {
    console.error("Fetch Error:", e);
    alert(
      "เรียกไฟล์ PHP ไม่สำเร็จ! (อาจเกิดจากพิมพ์ชื่อ Table หรือ Column ใน PHP ผิด ทำให้ PHP พัง)",
    );
  }
}

function processNextDisplacedBooking() {
  if (displacedBookingsQueue.length === 0) {
    document.getElementById("altRoomModal").classList.remove("active");
    loadRooms();
    return;
  }

  const booking = displacedBookingsQueue.shift();
  currentDisplacedBookingId = booking.booking_id;
  selectedAltRoomId = null;

  document.getElementById("altRoomModal").classList.add("active");
  document.getElementById("confirmMoveBtn").disabled = true;

  const altRooms = booking.alternative_rooms;

  let html = `
        <div class="alt-room-info-box">
            <strong class="alt-room-info-title"><i class="fa-solid fa-circle-info"></i> หาห้องแทนให้ (ID: ${booking.booking_id})</strong><br>
            <span class="alt-room-info-subtitle"><i class="fa-solid fa-people-group"></i> รองรับผู้เข้าร่วมเดิม: ${booking.attendees_count} คน</span>
        </div>`;

  if (altRooms && altRooms.length > 0) {
    html += '<div class="alt-room-list-container">';
    altRooms.forEach((room) => {
      html += `
            <div class="alt-room-layout-item">
                <input type="radio" name="alt_room" value="${room.room_id}" id="alt_room_${room.room_id}" onchange="selectAltRoom(${room.room_id})">
                <label for="alt_room_${room.room_id}" class="alt-room-label">
                    <strong class="alt-room-name"><i class="fa-solid fa-door-open"></i> ${room.room_name}</strong>
                    <span class="alt-room-details">(จุได้ ${room.capacity} คน, ชั้น ${room.floor_number || "-"})</span>
                </label>
            </div>`;
    });
    html += "</div>";
  } else {
    html +=
      '<div class="empty-state alt-room-empty-state"><i class="fa-solid fa-triangle-exclamation"></i> ไม่พบห้องว่างอื่นๆ ที่เหมาะสม</div>';
  }
  document.getElementById("altRoomList").innerHTML = html;
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
      showToast("ย้ายการจองไปยังห้องใหม่สำเร็จ!", "success");
    } else {
      showToast("ย้ายห้องไม่สำเร็จ: " + result.message, "error");
    }
  } catch (e) {
    showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
  }

  confirmBtn.innerHTML =
    '<i class="fa-solid fa-check"></i> ยืนยันการย้ายไปห้องนี้';
  setTimeout(processNextDisplacedBooking, 500);
}

function skipMoveRoom() {
  setTimeout(processNextDisplacedBooking, 300);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { showToast, showLoading, hideLoading, resetForm };
}
