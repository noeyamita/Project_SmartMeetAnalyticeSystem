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
            showAlert('จองห้องประชุมสำเร็จ', 'success', 8000);
            closeModal();
            searchRooms();
        } else {
            showAlert(result.message);
        }
    } catch (err) {
        console.error('Fetch error:', err);
        showAlert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    }
}


function renderRooms(rooms) {
    const roomsGrid = document.getElementById('roomsGrid');
    const userStart = document.getElementById("start_time").value;
    const userEnd = document.getElementById("end_time").value;
    const warning = document.getElementById("timeWarning");

    let hasAvailableRoom = false;

    // reset UI
    if (warning) warning.style.display = "none";
    roomsGrid.innerHTML = '';

    // ❗ ไม่มีข้อมูลเลย
    if (!rooms || rooms.length === 0) {
        roomsGrid.innerHTML = `
            <div class="empty-state">
                ❌ ไม่พบห้องประชุม
            </div>
        `;
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
        const card = document.createElement('div');
        card.className = `room-card ${statusClass}`;
        card.setAttribute('data-room-id', room.room_id);

        const imageUrl = room.image_url && room.image_url.trim() !== ''
            ? room.image_url
            : 'uploads/rooms/default_room.jpg';

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
                    <button class="btn primary"
                        onclick="openBookingModal(${room.room_id})"
                        ${isAvailable ? '' : 'disabled'}>
                        เลือกห้อง
                    </button>
                </div>
            </div>
        `;
        roomsGrid.appendChild(card);
    });

    if (!hasAvailableRoom) {
        if (warning) warning.style.display = "block";

        roomsGrid.innerHTML = `
            <div class="empty-state">
                ไม่มีห้องในช่วงเวลานี้<br>
                กรุณาเลือกเวลาใหม่
            </div>
        `;
    }
}

function openBookingModal(roomId) {
    selectedRoom = availableRooms.find(r => r.room_id == roomId);
    document.getElementById('bookingModal').classList.add('active');
}

function closeModal() {
    document.getElementById('bookingModal').classList.remove('active');
    selectedRoom = null;
}