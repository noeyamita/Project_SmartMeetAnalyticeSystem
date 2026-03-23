document.addEventListener('DOMContentLoaded', loadRequests);

async function loadRequests() {
    const container = document.getElementById('requestsContainer');
    try {
        const res = await fetch('src/api/getPendingRequests.php');
        const result = await res.json();

        if (result.status === 'success') {
            if (result.data.length === 0) {
                container.innerHTML = '<div class="empty-state">ไม่มีคำขอรอดำเนินการ</div>';
                return;
            }

            let html = '';
            result.data.forEach(req => {
                const startTime = req.start_time.substring(0, 5);
                const endTime = req.end_time.substring(0, 5);
                const ownersHtml = req.current_owners.length > 0
                    ? `<div class="req-owner">ผู้ที่ใช้ห้องนี้อยู่เดิม: ${req.current_owners.join(', ')}</div>`
                    : `<div class="req-owner" style="background:#ecfdf5; color:#10b981;">ห้องนี้ว่างแล้ว (ผู้จองเดิมอาจยกเลิกไป)</div>`;

                html += `
                    <div class="request-card">
                        <div class="req-info">
                            <h4>ผู้ขอ: ${req.fname} ${req.lname} (Executive)</h4>
                            <div class="req-detail"><strong>ห้อง:</strong> ${req.room_name}</div>
                            <div class="req-detail"><strong>วัน/เวลา:</strong> ${req.booking_date} | ${startTime} - ${endTime}</div>
                            <div class="req-detail"><strong>เหตุผล:</strong> ${req.purpose} (${req.attendees_count} คน)</div>
                            ${ownersHtml}
                        </div>
                        <div class="req-actions">
                            <button class="btn primary" style="background: #10b981;" onclick="manageRequest(${req.booking_id}, 'approve')">
                                <i class="fas fa-check" style="margin-right: 5px;"></i> อนุมัติ
                            </button>
                            <button class="btn danger" style="background: #ef4444;" onclick="manageRequest(${req.booking_id}, 'reject')">
                                <i class="fas fa-times" style="margin-right: 5px;"></i> ปฏิเสธ
                            </button>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }
    } catch (e) {
        container.innerHTML = '<div class="empty-state">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

async function manageRequest(bookingId, action) {
    if (!confirm(`คุณต้องการ ${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'} คำขอนี้ใช่หรือไม่?`)) return;

    try {
        const res = await fetch('src/api/manageRequest.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: bookingId, action: action })
        });
        const result = await res.json();

        if (result.status === 'success') {
            alert(result.message);
            if (action === 'approve' && result.displaced_bookings && result.displaced_bookings.length > 0) {
                displacedBookingsQueue = result.displaced_bookings;
                processNextDisplacedBooking();
            } else {
                loadRequests();
            }
        } else {
            alert('Error: ' + result.message);
        }
    } catch (e) {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
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

    document.getElementById('altRoomModal').classList.add('active');
    document.getElementById('altRoomList').innerHTML = '<div class="loading">กำลังค้นหาห้องว่าง...</div>';
    document.getElementById('confirmMoveBtn').disabled = true;

    try {
        const response = await fetch(`src/api/getAlternativeRooms.php?booking_id=${booking.booking_id}`);
        const result = await response.json();

        if (result.status === 'success' && result.data.length > 0) {
            let html = `<div style="margin-bottom: 15px; padding: 10px; background: #fffbeb; border-radius: 8px;">
                            <strong style="color:#d97706;">ต้องการหาห้องแทนให้เจ้าของเดิม (ID: ${booking.booking_id})</strong><br>
                            รองรับผู้เข้าร่วมเดิม: ${booking.attendees_count} คน
                        </div>`;
            html += '<div class="equipment-list" style="display:flex; flex-direction:column; gap:10px;">';
            result.data.forEach((room) => {
                html += `
                <div style="padding:10px; border:1px solid #ddd; border-radius:6px;">
                    <input type="radio" name="alt_room" value="${room.room_id}" id="alt_room_${room.room_id}" onchange="selectAltRoom(${room.room_id})">
                    <label for="alt_room_${room.room_id}">
                        <strong>${room.room_name}</strong>
                        <span style="font-size:13px; color:#666; margin-left:10px;">(จุได้ ${room.capacity} คน, ชั้น ${room.floor_number || '-'})</span>
                    </label>
                </div>`;
            });
            html += '</div>';
            document.getElementById('altRoomList').innerHTML = html;
        } else {
            document.getElementById('altRoomList').innerHTML = '<div class="empty-state" style="color:red;">❌ ไม่พบห้องว่างอื่นๆ ที่รองรับคนกลุ่มนี้ได้แล้ว</div>';
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
        const response = await fetch('src/api/moveBooking.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: currentDisplacedBookingId, new_room_id: selectedAltRoomId })
        });
        const result = await response.json();

        if (result.status === 'success') {
            alert('ย้ายเจ้าของเดิมไปยังห้องใหม่ พร้อมอุปกรณ์เดิมสำเร็จ!');
        } else {
            alert('ย้ายห้องไม่สำเร็จ: ' + result.message);
        }
    } catch (e) {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }

    confirmBtn.textContent = "ยืนยันการย้ายไปห้องนี้";
    document.getElementById('altRoomModal').classList.remove('active');

    setTimeout(processNextDisplacedBooking, 500);
}

function skipMoveRoom() {
    document.getElementById('altRoomModal').classList.remove('active');
    setTimeout(processNextDisplacedBooking, 500);
}