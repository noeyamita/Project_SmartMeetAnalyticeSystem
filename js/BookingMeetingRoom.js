let availableRooms = []; 
let selectedRoom = null; 

document.addEventListener('DOMContentLoaded', () => {
    // 1. กำหนดวันที่ปัจจุบันเป็นค่าเริ่มต้น
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    // ✅✅✅ ส่วนที่สำคัญ: เรียกใช้ฟังก์ชันดึงข้อมูลเมื่อโหลดหน้าจอ ✅✅✅
    fetchEquipments(); 
    fetchTableLayouts();
    // ✅✅✅
});


// ฟังก์ชันสำหรับแสดง/ซ่อน Alert
function showAlert(message, type = 'error', duration = 3000) {
    const alertBox = document.getElementById('alertBox');
    alertBox.textContent = message;
    alertBox.className = `alert ${type} active`;
    setTimeout(() => {
        alertBox.className = 'alert';
    }, duration);
}

// ที่ต้องแก้:
// 1. fetchEquipments()
async function fetchEquipments() {
    try {
        const response = await fetch('../src/api/getEquipments.php'); // ✅ แก้ไข
        const result = await response.json();
        const equipmentOptions = document.getElementById('equipmentOptions');
        equipmentOptions.innerHTML = '';

        if (result.status === 'success' && result.data.length > 0) {
            equipmentOptions.className = 'equipment-list'; 
            result.data.forEach(equipment => {
                const item = document.createElement('div');
                item.className = 'equipment-item';
                item.innerHTML = `
                    <label for="equipment_${equipment.equipment_id}">
                        <input type="checkbox" id="equipment_${equipment.equipment_id}" 
                               name="equipment_id" value="${equipment.equipment_id}">
                        ${equipment.equipment_name}
                    </label>
                `;
                equipmentOptions.appendChild(item);
            });
        } else {
            equipmentOptions.innerHTML = '<p class="muted">ไม่พบรายการอุปกรณ์</p>';
        }

    } catch (error) {
        console.error("Error fetching equipments:", error);
    }
}

// 2. fetchTableLayouts()
async function fetchTableLayouts() {
    try {
        const response = await fetch('../src/api/getTableLayouts.php'); // ✅ แก้ไข
        const result = await response.json();
        const layoutOptions = document.getElementById('tableLayoutOptions');
        layoutOptions.innerHTML = '';

        if (result.status === 'success' && result.data.length > 0) {
            result.data.forEach((layout, index) => {
                const item = document.createElement('label');
                item.style.marginRight = '15px';
                item.innerHTML = `
                    <input type="radio" id="layout_${layout.tablelayout_id}" 
                           name="table_layout_id" value="${layout.tablelayout_id}" 
                           ${index === 0 ? 'checked' : ''}>
                    ${layout.tablelayout_name}
                `;
                layoutOptions.appendChild(item);
            });
        } else {
            layoutOptions.innerHTML = '<p class="muted">ไม่พบรายการรูปแบบโต๊ะ</p>';
        }

    } catch (error) {
        console.error("Error fetching table layouts:", error);
    }
}

// 3. searchRooms()
async function searchRooms() {
    const date = document.getElementById('date').value;
    const startTime = document.getElementById('start_time').value;
    const endTime = document.getElementById('end_time').value;
    const capacity = document.getElementById('capacity').value;
    const roomsGrid = document.getElementById('roomsGrid');

    if (!date || !startTime || !endTime || !capacity) {
        showAlert('กรุณากรอกข้อมูลวันที่, เวลาเริ่มต้น, เวลาสิ้นสุด และจำนวนผู้เข้าร่วมให้ครบถ้วน');
        return;
    }

    if (startTime >= endTime) {
        showAlert('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
        return;
    }

    roomsGrid.innerHTML = '<div class="loading">กำลังค้นหาห้องประชุม...</div>';
    availableRooms = []; 

    try {
        const url = `../src/api/getRooms.php?capacity=${capacity}`; // ✅ แก้ไข
        const response = await fetch(url);
        const result = await response.json();

        if (result.status === 'success' && result.data.length > 0) {
            availableRooms = result.data.filter(room => room.status === 1); 
            renderRooms(availableRooms);
            showAlert(`พบห้องประชุมว่าง ${availableRooms.length} ห้อง`, 'success');

        } else if (result.status === 'success' && result.data.length === 0) {
            roomsGrid.innerHTML = '<div class="empty-state">ไม่พบห้องประชุมที่รองรับตามเงื่อนไข</div>';
        } else {
            showAlert(`เกิดข้อผิดพลาดในการดึงข้อมูล: ${result.message}`);
        }
    } catch (error) {
        console.error("Error during room search:", error);
        showAlert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่อค้นหาห้องได้');
    }
}

// 4. confirmBooking()
async function confirmBooking() {
    if (!selectedRoom) {
        showAlert('กรุณาเลือกห้องประชุมก่อน');
        return;
    }

    const meetingTitle = document.getElementById('meeting_title').value;
    const meetingDescription = document.getElementById('meeting_description').value;
    const date = document.getElementById('date').value;
    const startTime = document.getElementById('start_time').value;
    const endTime = document.getElementById('end_time').value;
    const capacity = document.getElementById('capacity').value;
    
    const selectedLayout = document.querySelector('input[name="table_layout_id"]:checked');
    const tableLayoutId = selectedLayout ? selectedLayout.value : null;

    const selectedEquipments = Array.from(document.querySelectorAll('input[name="equipment_id"]:checked'))
                                     .map(cb => cb.value);

    if (!meetingTitle) {
        showAlert('กรุณาระบุหัวข้อการประชุม');
        return;
    }
    
    if (!tableLayoutId) {
         showAlert('กรุณาเลือกรูปแบบการจัดโต๊ะ');
         return;
    }

    const bookingData = {
        room_id: selectedRoom.room_id,
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        capacity: capacity,
        purpose: meetingTitle,
        description: meetingDescription,
        table_layout_id: tableLayoutId,
        equipments: selectedEquipments
    };
    
    try {
        const response = await fetch('../src/api/createBooking.php', { // ✅ แก้ไข
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });

        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error("Booking Error: Failed to parse JSON response. Response Text:", text);
            showAlert(`การจองล้มเหลว: เซิร์ฟเวอร์ส่งข้อมูลกลับมาไม่ถูกต้อง (โค้ด PHP อาจมี Fatal Error)`, 'error', 8000);
            return;
        }

        if (result.status === 'success') {
            closeModal();
            showAlert(`จองห้อง ${selectedRoom.room_name} สำเร็จ!`, 'success', 5000);
            searchRooms();
        } else {
            showAlert(`จองไม่สำเร็จ: ${result.message}`, 'error', 8000);
        }
    } catch (error) {
        console.error("Booking Error:", error);
        showAlert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'error', 8000);
    }
}


// ----------------------------------------------------
// 4. การแสดงผล Room Card พร้อม รูปภาพและเวลาเปิด-ปิด
// ----------------------------------------------------
function renderRooms(rooms) {
    const roomsGrid = document.getElementById('roomsGrid');
    roomsGrid.innerHTML = ''; 

    if (rooms.length === 0) {
        roomsGrid.innerHTML = '<div class="empty-state">ไม่พบห้องประชุมว่างในช่วงเวลาที่กำหนด</div>';
        return;
    }

    rooms.forEach(room => {
        const card = document.createElement('div');
        const isAvailable = room.status === 1; 
        const statusClass = isAvailable ? 'available' : 'unavailable'; 
        const chipClass = isAvailable ? 'available' : 'booked';
        const statusText = isAvailable ? 'ว่าง' : 'ไม่ว่าง';

        card.className = `room-card ${statusClass}`;
        card.setAttribute('data-room-id', room.room_id);

        let imageStyle = '';
        let imageClass = 'room-image';
        if (room.image_url) {
            imageStyle = `background-image: url('../html/uploads/rooms/${room.image_url}');`; // ✅ แก้ไข path
        } else {
            imageClass += ' no-image';
        }

        const operatingHours = `${room.open_time || '00:00'} - ${room.close_time || '23:59'}`;
        const roomLocation = `ชั้น ${room.floor_number}, ขนาด ${room.room_size || 'N/A'}`;

        card.innerHTML = `
            <div class="${imageClass}" style="${imageStyle}"></div>
            <div class="room-details">
                <div class="room-title">${room.room_name}</div>
                
                <div class="operating-hours">
                    ${operatingHours}
                </div>

                <div class="room-cap">
                    รองรับ ${room.capacity} คน, ${roomLocation}
                </div>
                <div class="room-facilities">
                    </div>

                <div class="room-status">
                    <div class="status-badge">
                        <span class="chip ${chipClass}"></span>
                        ${statusText}
                    </div>
                    <button class="btn primary" onclick="openBookingModal(${room.room_id})" ${isAvailable ? '' : 'disabled'}>
                        เลือกห้อง
                    </button>
                </div>
            </div>
        `;
        roomsGrid.appendChild(card);
    });
}

// ----------------------------------------------------
// 5. การเปิด Modal สำหรับจอง
// ----------------------------------------------------
function openBookingModal(roomId) {
    selectedRoom = availableRooms.find(room => room.room_id == roomId);

    if (!selectedRoom) {
        showAlert('ไม่พบข้อมูลห้องประชุมที่เลือก');
        return;
    }

    const modalRoomInfo = document.getElementById('modalRoomInfo');
    const openTime = document.getElementById('start_time').value;
    const closeTime = document.getElementById('end_time').value;
    const date = document.getElementById('date').value;
    const capacity = document.getElementById('capacity').value;

    modalRoomInfo.innerHTML = `
        ห้อง **${selectedRoom.room_name}** | 
        จำนวน ${capacity} คน | 
        จองวันที่ ${date} 
        เวลา **${openTime} - ${closeTime}**
    `;

    document.getElementById('bookingModal').classList.add('active');
}

function closeModal() {
    document.getElementById('bookingModal').classList.remove('active');
    selectedRoom = null;
    document.getElementById('meeting_title').value = '';
    document.getElementById('meeting_description').value = '';
    document.querySelectorAll('input[name="equipment_id"]').forEach(cb => cb.checked = false);
    
    // ตรวจสอบและเลือก radio button ตัวแรกเป็น default เมื่อปิด Modal
    const firstLayout = document.querySelector('input[name="table_layout_id"]');
    if (firstLayout) firstLayout.checked = true;
}


// ----------------------------------------------------
// 7. ล้างค่าการค้นหา
// ----------------------------------------------------
function resetSearch() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    document.getElementById('start_time').value = '';
    document.getElementById('end_time').value = '';
    document.getElementById('capacity').value = '1';

    document.getElementById('roomsGrid').innerHTML = `
        <div class="empty-state">
            <div style="font-size: 64px; opacity: 0.3; ">📅</div>
            <p>กรุณาเลือกวันที่และเวลาเพื่อค้นหาห้องว่าง</p>
        </div>
    `;
    availableRooms = [];
    selectedRoom = null;
    document.getElementById('alertBox').className = 'alert';
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Page loaded, initializing...');
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    console.log('📞 Calling fetchEquipments()...');
    fetchEquipments();
    
    console.log('📞 Calling fetchTableLayouts()...');
    fetchTableLayouts();
});