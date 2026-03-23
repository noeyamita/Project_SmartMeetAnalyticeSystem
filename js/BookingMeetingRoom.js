const API_BASE = "src/api/";
let searchCriteria = null;
let availableRooms = [];
let selectedRoom = null;

function getMaxAdvanceDaysByRole() {
    switch (window.USER_ROLE) {
        case 'admin':
            return null;
        case 'executive':
            return 30;
        case 'normal':
        default:
            return 14;
    }
}

function isWithinRoleAdvanceLimit(bookingDate) {
    const maxDays = getMaxAdvanceDaysByRole();
    if (maxDays === null) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const booking = new Date(bookingDate + 'T00:00:00');
    const diffDays = (booking - today) / (1000 * 60 * 60 * 24);

    return diffDays <= maxDays;
}

function isValidTime(timeString) {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(timeString);
}

function timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

function isNotPastTime(date, time) {
    const now = new Date();
    const bookingDateTime = new Date(date + 'T' + time + ':00');
    return bookingDateTime > now;
}

function isBookingAtLeast3HoursInAdvance(date, time) {
    const now = new Date();
    const bookingDateTime = new Date(date + 'T' + time + ':00');
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

function showAlert(message, type = 'error', duration = 4000) {
    const alertBox = document.getElementById('alertBox');
    alertBox.textContent = message;
    alertBox.className = `alert ${type} active`;
    alertBox.style.position = 'fixed';
    alertBox.style.top = '20px';
    alertBox.style.transform = 'translateX(-50%)';
    alertBox.style.zIndex = '9999';
    alertBox.style.minWidth = '300px';
    alertBox.style.textAlign = 'center';
    setTimeout(() => {
        alertBox.className = 'alert';
    }, duration);
}

document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    const qStart = sessionStorage.getItem('quickBook_start');
    const qEnd = sessionStorage.getItem('quickBook_end');

    if (qStart && qEnd) {
        document.getElementById('start_time').value = qStart;
        document.getElementById('end_time').value = qEnd;

        sessionStorage.removeItem('quickBook_start');
        sessionStorage.removeItem('quickBook_end');
        setTimeout(() => searchRooms(), 500);
    }

    fetchEquipments();
    fetchTableLayouts();
});
async function fetchEquipments() {
    try {
        const response = await fetch('src/api/getEquipments.php');
        const result = await response.json();

        const box = document.getElementById('equipmentOptions');
        box.innerHTML = '';

        if (result.status === 'success') {
            result.data.forEach(e => {
                box.innerHTML += `
                <div class="equipment-item">
                    <label>
                        <input type="checkbox" name="equipment_id" value="${e.equipment_id}">
                        ${e.equipment_name}
                    </label>
                </div>`;
            });
        }
    } catch (err) {
        console.error(err);
        showAlert('โหลดอุปกรณ์ไม่สำเร็จ');
    }
}

async function fetchTableLayouts() {
    try {
        const response = await fetch('src/api/getTableLayouts.php');
        const result = await response.json();
        const box = document.getElementById('tableLayoutOptions');
        box.innerHTML = '';

        if (result.status === 'success') {
            result.data.forEach((l, i) => {
                box.innerHTML += `
                <div class="layout-item">
                    <label>
                        <input type="radio" name="table_layout_id" value="${l.tablelayout_id}" id="layout_${l.tablelayout_id}" ${i === 0 ? 'checked' : ''}>
                    <label for="layout_${l.tablelayout_id}">
                        ${l.tablelayout_name}
                    </label>
                </div>`;
            });
        }
    } catch {
        showAlert('โหลดรูปแบบโต๊ะไม่สำเร็จ');
    }
}


async function searchRooms() {
    const date = document.getElementById('date').value;
    const start = document.getElementById('start_time').value;
    const end = document.getElementById('end_time').value;
    const cap = document.getElementById('capacity').value;

    if (!date || !start || !end) {
        showAlert('กรุณากรอกข้อมูลให้ครบ');
        return;
    }

    if (!isValidTime(start) || !isValidTime(end)) {
        showAlert('รูปแบบเวลาไม่ถูกต้อง');
        return;
    }

    if (timeToMinutes(start) >= timeToMinutes(end)) {
        showAlert('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
        return;
    }

    if (!isNotPastTime(date, start)) {
        showAlert('ไม่สามารถจองเวลาที่ผ่านมาแล้ว');
        return;
    }

    if (!isBookingAtLeast3HoursInAdvance(date, start)) {
        showAlert('ต้องจองล่วงหน้าอย่างน้อย 3 ชั่วโมง', 'warning');
        return;
    }

    if (!isWithinRoleAdvanceLimit(date)) {
        let msg = 'วันที่เกินสิทธิ์การจองของคุณ';
        if (USER_ROLE === 'executive') msg = 'Executive จองล่วงหน้าได้ไม่เกิน 1 เดือน';
        if (USER_ROLE === 'normal') msg = 'ผู้ใช้ทั่วไปจองล่วงหน้าได้ไม่เกิน 2 สัปดาห์';
        showAlert(msg, 'warning', 6000);
        return;
    }

    const url = `../src/api/getRooms.php?capacity=${cap}&date=${date}&start_time=${start}&end_time=${end}`;
    const response = await fetch(url);
    const result = await response.json();

    availableRooms = result.data || [];
    renderRooms(availableRooms);
}

function resetSearch() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const formattedToday = `${yyyy}-${mm}-${dd}`;
    document.getElementById('date').value = formattedToday;
    document.getElementById('start_time').value = '';
    document.getElementById('end_time').value = '';
    document.getElementById('capacity').value = '';
    availableRooms = [];
    selectedRoom = null;

    if (typeof renderRooms === "function") {
        renderRooms(availableRooms);
    }
    const inputs = document.querySelectorAll('input[name="equipment_id"], input[name="table_layout_id"]');
    inputs.forEach(input => input.checked = false);

    console.log("ล้างข้อมูลการค้นหาเรียบร้อยแล้ว");
}



async function confirmBooking() {
    if (!selectedRoom) {
        showAlert('กรุณาเลือกห้อง');
        return;
    }

    const date = document.getElementById('date').value;
    const start = document.getElementById('start_time').value;

    if (!isWithinRoleAdvanceLimit(date)) {
        showAlert('วันที่เลือกเกินสิทธิ์การจองของคุณ', 'warning');
        return;
    }
    const confirmBtn = document.querySelector('.modal-footer .btn.primary');
    const originalText = confirmBtn.textContent;
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'กำลังดำเนินการ...';
    const bookingData = {
        room_id: selectedRoom.room_id,
        booking_date: date,
        start_time: start,
        end_time: document.getElementById('end_time').value,
        capacity: parseInt(document.getElementById('capacity').value),
        purpose: document.getElementById('meeting_title').value,
        table_layout_id: parseInt(document.querySelector('input[name="table_layout_id"]:checked').value),
        equipments: Array.from(document.querySelectorAll('input[name="equipment_id"]:checked'))
            .map(e => parseInt(e.value))
    };

    try {
        const response = await fetch('../src/api/createBooking.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });

        const text = await response.text();

        let result;
        try {
            result = JSON.parse(text);
        } catch {
            console.error('Server response (not JSON):', text);
            showAlert('เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง');
            return;
        }

        if (result.status === 'success') {
            showAlert(result.message, 'success', 8000);
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
        console.error('Fetch error:', err);
        showAlert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}


function renderRooms(rooms) {
    const roomsGrid = document.getElementById('roomsGrid');
    const userStart = document.getElementById("start_time").value;
    const userEnd = document.getElementById("end_time").value;
    const warning = document.getElementById("timeWarning");

    let rawRole = sessionStorage.getItem('userRole') || window.USER_ROLE || 'normal';
    const currentUserRole = rawRole.toLowerCase();
    let hasAvailableRoom = false;

    if (warning) warning.style.display = "none";
    roomsGrid.innerHTML = '';

    if (!rooms || rooms.length === 0) {
        roomsGrid.innerHTML = `<div class="empty-state">ไม่พบห้องประชุม</div>`;
        if (warning) warning.style.display = "block";
        return;
    }

    rooms.forEach(room => {
        const roomStart = room.open_time;
        const roomEnd = room.close_time;
        if (!isTimeInRange(userStart, userEnd, roomStart, roomEnd)) {
            return;
        }

        hasAvailableRoom = true;
        const status = room.availability_status || 'unknown';
        const statusText = room.availability_text || 'ไม่ทราบสถานะ';

        let chipClass = '';
        let statusClass = '';
        if (status === 'available') {
            chipClass = 'available';
            statusClass = 'available';
        } else if (status === 'booked' || status === 'closed') {
            chipClass = status;
            statusClass = 'unavailable';
        } else {
            chipClass = 'unknown';
            statusClass = 'unavailable';
        }

        const isAvailable = status === 'available';
        let buttonHtml = '';
        if (isAvailable) {
            buttonHtml = `<button class="btn primary" onclick="openBookingModal(${room.room_id}, false)">เลือกห้อง</button>`;
        } else {
            if (currentUserRole === 'executive') {
                buttonHtml = `<button class="btn warning" style="background-color: #f59e0b; color: white;" onclick="openBookingModal(${room.room_id}, true)">ขอใช้ห้องแทน</button>`;
            } else if (currentUserRole === 'admin') {
                buttonHtml = `<button class="btn danger" style="background-color: #ef4444; color: white;" onclick="openBookingModal(${room.room_id}, true)">จองทับ / ย้าย</button>`;
            } else {
                buttonHtml = `<button class="btn primary" disabled>เลือกห้อง</button>`;
            }
        }

        const card = document.createElement('div');
        card.className = `room-card ${statusClass}`;
        card.setAttribute('data-room-id', room.room_id);

        const imageUrl = room.image_url && room.image_url.trim() !== '' ? room.image_url : 'uploads/rooms/default_room.jpg';
        const operatingHours = `${room.open_time || '00:00'} - ${room.close_time || '23:59'}`;
        const roomLocation = `${room.floor_number || '-'} | ขนาด ${room.room_size || 'N/A'}`;

        card.innerHTML = `
            <div class="room-image" style="background-image: url('${imageUrl}');"></div>
            <div class="room-details">
                <div class="room-title">${room.room_name}</div>
                <div class="operating-hours">${operatingHours}</div>
                <div class="room-cap">
                    ความจุ ${room.capacity} คน<br>${roomLocation}
                </div>
                <div class="room-status">
                    <div class="status-badge">
                        <span class="chip ${chipClass}"></span>
                        ${statusText}
                    </div>
                    ${buttonHtml}
                </div>
            </div>
        `;
        roomsGrid.appendChild(card);
    });

    if (!hasAvailableRoom) {
        if (warning) warning.style.display = "block";
        roomsGrid.innerHTML = `<div class="empty-state">ไม่มีห้องในช่วงเวลานี้<br>กรุณาเลือกเวลาใหม่</div>`;
    }
}

let isOverrideRequest = false;
function openBookingModal(roomId, isOverride = false) {
    selectedRoom = availableRooms.find(r => r.room_id == roomId);
    isOverrideRequest = isOverride;
    document.getElementById('bookingModal').classList.add('active');
    const modalTitle = document.querySelector('.modal-header h3');
    const currentUserRole = (sessionStorage.getItem('userRole') || 'normal').toLowerCase();

    if (isOverride) {
        if (currentUserRole === 'admin') {
            modalTitle.textContent = 'ยืนยันการจองทับ (สิทธิ์ Admin)';
            modalTitle.style.color = '#ef4444';
        } else {
            modalTitle.textContent = 'ส่งคำขอใช้ห้องแทน (สิทธิ์ Executive)';
            modalTitle.style.color = '#f59e0b';
        }
    } else {
        modalTitle.textContent = 'ยืนยันการจองห้องประชุม';
        modalTitle.style.color = '#2c3e50';
    }
}

function closeModal() {
    document.getElementById('bookingModal').classList.remove('active');
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

    document.getElementById('altRoomModal').classList.add('active');
    document.getElementById('altRoomList').innerHTML = '<div class="loading">กำลังค้นหาห้องว่าง...</div>';
    document.getElementById('confirmMoveBtn').disabled = true;

    try {
        const response = await fetch(`../src/api/getAlternativeRooms.php?booking_id=${booking.booking_id}`);
        const result = await response.json();

        if (result.status === 'success' && result.data.length > 0) {
            let html = `<div style="margin-bottom: 15px; padding: 10px; background: #fffbeb; border-radius: 8px;">
                            <strong style="color:#d97706;">ต้องการหาห้องแทนให้ (ID: ${booking.booking_id})</strong><br>
                            รองรับผู้เข้าร่วมเดิม: ${booking.attendees_count} คน
                        </div>`;
            html += '<div class="equipment-list">';
            result.data.forEach((room) => {
                html += `
                <div class="layout-item">
                    <input type="radio" name="alt_room" value="${room.room_id}" id="alt_room_${room.room_id}" onchange="selectAltRoom(${room.room_id})">
                    <label for="alt_room_${room.room_id}" style="display:flex; flex-direction:column;">
                        <strong>${room.room_name}</strong>
                        <span style="font-size:12px; color:#666;">(จุได้ ${room.capacity} คน, ชั้น ${room.floor_number || '-'})</span>
                    </label>
                </div>`;
            });
            html += '</div>';
            document.getElementById('altRoomList').innerHTML = html;
        } else {
            document.getElementById('altRoomList').innerHTML = '<div class="empty-state">ไม่พบห้องว่างอื่นๆ ที่รองรับจำนวนคนได้ในช่วงเวลานี้</div>';
        }
    } catch (e) {
        document.getElementById('altRoomList').innerHTML = '<div class="empty-state">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

function selectAltRoom(roomId) {
    selectedAltRoomId = roomId;
    document.getElementById('confirmMoveBtn').disabled = false;
}

async function confirmMoveRoom() {
    if (!selectedAltRoomId) return;
    const confirmBtn = document.getElementById('confirmMoveBtn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = "กำลังย้ายห้อง...";

    try {
        const response = await fetch('../src/api/moveBooking.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                booking_id: currentDisplacedBookingId,
                new_room_id: selectedAltRoomId
            })
        });
        const result = await response.json();

        if (result.status === 'success') {
            showAlert('ย้ายการจองไปยังห้องใหม่ พร้อมอุปกรณ์เดิมสำเร็จ!', 'success');
        } else {
            showAlert('ย้ายห้องไม่สำเร็จ: ' + result.message);
        }
    } catch (e) {
        showAlert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
    confirmBtn.textContent = "ยืนยันการย้ายไปห้องนี้";
    document.getElementById('altRoomModal').classList.remove('active');
    searchRooms();
    if (displacedBookingsQueue.length > 0) {
        setTimeout(processNextDisplacedBooking, 500);
    }
}

function skipMoveRoom() {
    document.getElementById('altRoomModal').classList.remove('active');
    if (displacedBookingsQueue.length > 0) {
        setTimeout(processNextDisplacedBooking, 500);
    }
}