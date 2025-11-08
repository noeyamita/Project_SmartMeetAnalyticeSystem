const API_BASE = "src/api/";
let searchCriteria = null;
let availableRooms = []; 
let selectedRoom = null; 

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Page loaded, initializing...');
    
    // กำหนดวันที่ปัจจุบันเป็นค่าเริ่มต้น
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    // เรียกใช้ฟังก์ชันดึงข้อมูลเมื่อโหลดหน้าจอ 
    console.log('📞 Calling fetchEquipments()...');
    fetchEquipments(); 
    
    console.log('📞 Calling fetchTableLayouts()...');
    fetchTableLayouts();
});

//ฟังก์ชันตรวจสอบรูปแบบเวลา HH:MM
function isValidTime(timeString) {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(timeString);
}

//ฟังก์ชันแปลงเวลา HH:MM เป็นนาที (สำหรับเปรียบเทียบ)
function timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

// ฟังก์ชันสำหรับแสดง/ซ่อน Alert
function showAlert(message, type = 'error', duration = 3000) {
    const alertBox = document.getElementById('alertBox');
    alertBox.textContent = message;
    alertBox.className = `alert ${type} active`;
    setTimeout(() => {
        alertBox.className = 'alert';
    }, duration);
}

//1. fetchEquipments() - ดึงข้อมูลอุปกรณ์
async function fetchEquipments() {
    try {
        const response = await fetch('../src/api/getEquipments.php'); 
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
        showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลอุปกรณ์');
    }
}

//2. fetchTableLayouts() - ดึงข้อมูลรูปแบบโต๊ะ
async function fetchTableLayouts() {
    try {
        const response = await fetch('../src/api/getTableLayouts.php'); 
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
                    <span>${layout.tablelayout_name}</span>
                `;
                layoutOptions.appendChild(item);
            });
        } else {
            layoutOptions.innerHTML = '<p class="muted">ไม่พบรายการรูปแบบโต๊ะ</p>';
        }

    } catch (error) {
        console.error("Error fetching table layouts:", error);
        showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลรูปแบบโต๊ะ');
    }
}

//3. searchRooms() - ค้นหาห้องประชุมที่ว่าง
async function searchRooms() {
    const date = document.getElementById('date').value;
    const startTime = document.getElementById('start_time').value;
    const endTime = document.getElementById('end_time').value;
    const capacity = document.getElementById('capacity').value;
    const roomsGrid = document.getElementById('roomsGrid');

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!date || !startTime || !endTime || !capacity) {
        showAlert('กรุณากรอกข้อมูลวันที่, เวลาเริ่มต้น, เวลาสิ้นสุด และจำนวนผู้เข้าร่วมให้ครบถ้วน');
        return;
    }

      //ตรวจสอบว่าวันที่ไม่ย้อนหลัง
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date + 'T00:00:00');
    
    if (selectedDate < today) {
        showAlert('ไม่สามารถจองย้อนหลังได้ กรุณาเลือกวันที่ปัจจุบันหรืออนาคต');
        return;
    }

    //ตรวจสอบรูปแบบเวลา
    if (!isValidTime(startTime)) {
        showAlert('รูปแบบเวลาเริ่มต้นไม่ถูกต้อง (ต้องเป็น HH:MM เช่น 09:00)');
        return;
    }

    if (!isValidTime(endTime)) {
        showAlert('รูปแบบเวลาสิ้นสุดไม่ถูกต้อง (ต้องเป็น HH:MM เช่น 10:30)');
        return;
    }


    //ตรวจสอบว่าเวลาสิ้นสุดมากกว่าเวลาเริ่มต้น
    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
        showAlert('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
        return;
    }

    //ตรวจสอบจำนวนผู้เข้าร่วม
    const capacityNum = parseInt(capacity);
    if (capacityNum < 1 || capacityNum > 1000) {
        showAlert('จำนวนผู้เข้าร่วมต้องอยู่ระหว่าง 1-1000 คน');
        return;
    }

    roomsGrid.innerHTML = '<div class="loading">กำลังค้นหาห้องประชุม...</div>';
    availableRooms = []; 

    try {
        //ส่งข้อมูลวันที่และเวลาไปตรวจสอบด้วย
        const url = `../src/api/getRooms.php?capacity=${capacityNum}&date=${date}&start_time=${startTime}&end_time=${endTime}`; 
        const response = await fetch(url);
        const result = await response.json();

        if (result.status === 'success' && result.data.length > 0) {
            //แยกห้องตามสถานะ
            availableRooms = result.data;
            const trulyAvailable = availableRooms.filter(room => room.availability_status === 'available');
            
            if (availableRooms.length > 0) {
                renderRooms(availableRooms);
                showAlert(`พบห้องทั้งหมด ${availableRooms.length} ห้อง (ว่าง ${trulyAvailable.length} ห้อง)`, 'success');
            } else {
                roomsGrid.innerHTML = '<div class="empty-state">ไม่พบห้องประชุมที่รองรับตามเงื่อนไข</div>';
                showAlert('ไม่พบห้องประชุมที่ตรงตามเงื่อนไข');
            }

        } else if (result.status === 'success' && result.data.length === 0) {
            roomsGrid.innerHTML = '<div class="empty-state">ไม่พบห้องประชุมที่รองรับตามเงื่อนไข</div>';
        } else {
            roomsGrid.innerHTML = '<div class="empty-state">เกิดข้อผิดพลาดในการค้นหา</div>';
            showAlert(`เกิดข้อผิดพลาดในการดึงข้อมูล: ${result.message}`);
        }
    } catch (error) {
        console.error("Error during room search:", error);
        roomsGrid.innerHTML = '<div class="empty-state">เกิดข้อผิดพลาดในการเชื่อมต่อ</div>';
        showAlert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่อค้นหาห้องได้');
    }
}

//4. confirmBooking() - ยืนยันการจอง
async function confirmBooking() {
    if (!selectedRoom) {
        showAlert('กรุณาเลือกห้องประชุมก่อน');
        return;
    }

    const meetingTitle = document.getElementById('meeting_title').value.trim();
    const date = document.getElementById('date').value;
    const startTime = document.getElementById('start_time').value;
    const endTime = document.getElementById('end_time').value;
    const capacity = document.getElementById('capacity').value;
    
    const selectedLayout = document.querySelector('input[name="table_layout_id"]:checked');
    const tableLayoutId = selectedLayout ? selectedLayout.value : null;

    const selectedEquipments = Array.from(document.querySelectorAll('input[name="equipment_id"]:checked'))
                                     .map(cb => cb.value);

    // ตรวจสอบข้อมูล
    if (!meetingTitle) {
        showAlert('กรุณาระบุหัวข้อการประชุม');
        return;
    }

    if (meetingTitle.length > 200) {
        showAlert('หัวข้อการประชุมยาวเกินไป (สูงสุด 200 ตัวอักษร)');
        return;
    }
    
    if (!tableLayoutId) {
        showAlert('กรุณาเลือกรูปแบบการจัดโต๊ะ');
        return;
    }

    //ตรวจสอบเวลาอีกครั้งก่อนส่ง
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
        showAlert('รูปแบบเวลาไม่ถูกต้อง');
        return;
    }

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
        showAlert('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
        return;
    }

    const bookingData = {
        room_id: selectedRoom.room_id,
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        capacity: parseInt(capacity),
        purpose: meetingTitle,
        table_layout_id: parseInt(tableLayoutId),
        equipments: selectedEquipments.map(id => parseInt(id))
    };

    console.log('📤 Sending booking data:', bookingData);
    
    // ✅ เก็บชื่อห้องไว้ก่อนที่จะปิด Modal
    const roomName = selectedRoom.room_name;
    
    try {
        const response = await fetch('../src/api/createBooking.php', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });

        const text = await response.text();
        console.log('📥 Response text:', text);
        
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error("❌ Failed to parse JSON response. Response Text:", text);
            showAlert('การจองล้มเหลว: เซิร์ฟเวอร์ส่งข้อมูลกลับมาไม่ถูกต้อง', 'error', 8000);
            return;
        }

        if (result.status === 'success') {
            closeModal();
            showAlert(`✅ จองห้อง ${roomName} สำเร็จ! (${result.booking_time || ''})`, 'success', 20000);
            
            // รีเฟรชรายการห้อง
            setTimeout(() => {
                searchRooms();
            }, 20000);
            
        } else {
            showAlert(`❌ จองไม่สำเร็จ: ${result.message}`, 'error', 8000);
        }
    } catch (error) {
        console.error("❌ Booking Error:", error);
        showAlert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'error', 8000);
    }
}


//renderRooms() - แสดงรายการห้องประชุม (รูปขึ้นแน่นอน)
function renderRooms(rooms) {
    const roomsGrid = document.getElementById('roomsGrid');
    roomsGrid.innerHTML = '';

    if (!rooms || rooms.length === 0) {
        roomsGrid.innerHTML = '<div class="empty-state">ไม่พบห้องประชุมในช่วงเวลาที่กำหนด</div>';
        return;
    }

    rooms.forEach(room => {
        const card = document.createElement('div');

        //ใช้ข้อมูลสถานะจาก API
        const status = room.availability_status || 'unknown';
        const statusText = room.availability_text || 'ไม่ทราบสถานะ';

        //สีสถานะ
        let chipClass = '';
        let statusClass = '';
        if (status === 'available') {
            chipClass = 'available';
            statusClass = 'available';
        } else if (status === 'booked') {
            chipClass = 'booked';
            statusClass = 'unavailable';
        } else if (status === 'closed') {
            chipClass = 'closed';
            statusClass = 'unavailable';
        } else {
            chipClass = 'unknown';
            statusClass = 'unavailable';
        }

        //ห้องว่างเท่านั้นที่กดเลือกได้
        const isAvailable = status === 'available';

        card.className = `room-card ${statusClass}`;
        card.setAttribute('data-room-id', room.room_id);

        //ตรวจสอบ path รูป (ไม่เติม ../html/)
        const imageUrl = room.image_url && room.image_url.trim() !== ''
            ? room.image_url
            : 'uploads/rooms/default_room.jpg';

        const operatingHours = `${room.open_time || '00:00'} - ${room.close_time || '23:59'}`;
        const roomLocation = `${room.floor_number || '-'} | ขนาด ${room.room_size || 'N/A'}`;

        //สร้าง HTML การ์ด
        card.innerHTML = `
            <div class="room-image" style="background-image: url('${imageUrl}');"></div>
            <div class="room-details">
                <div class="room-title">${room.room_name}</div>
                <div class="operating-hours">${operatingHours}</div>
                <div class="room-cap">ความจุ ${room.capacity} คน<br>${roomLocation}</div>
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



// 6. openBookingModal() - เปิด Modal สำหรับจอง
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

    //ตรวจสอบจำนวนคนไม่เกินความจุของห้อง
    if (capacity > selectedRoom.capacity) {
        showAlert(`จำนวนผู้เข้าร่วม (${capacity} คน) เกินความจุของห้อง ${selectedRoom.room_name} (รองรับได้ ${selectedRoom.capacity} คน)`, 'error', 5000);
        return;
    }

    // แปลงวันที่เป็นรูปแบบไทย
    const dateObj = new Date(date + 'T00:00:00');
    const thaiDate = dateObj.toLocaleDateString('th-TH', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    modalRoomInfo.innerHTML = `
        ห้อง <strong>${selectedRoom.room_name}</strong> | 
        จำนวน ${capacity} คน | 
        วันที่ ${thaiDate}<br>
        เวลา <strong>${openTime} - ${closeTime}</strong>
    `;

    document.getElementById('bookingModal').classList.add('active');
}

//7. closeModal() - ปิด Modal
function closeModal() {
    document.getElementById('bookingModal').classList.remove('active');
    selectedRoom = null;
    document.getElementById('meeting_title').value = '';
    document.querySelectorAll('input[name="equipment_id"]').forEach(cb => cb.checked = false);
    
    // เลือก radio button ตัวแรกเป็น default
    const firstLayout = document.querySelector('input[name="table_layout_id"]');
    if (firstLayout) firstLayout.checked = true;
}

//8. resetSearch() - ล้างค่าการค้นหา
function resetSearch() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    document.getElementById('start_time').value = '';
    document.getElementById('end_time').value = '';
    document.getElementById('capacity').value = '1';

    document.getElementById('roomsGrid').innerHTML = `
        <div class="empty-state">
            <div style="font-size: 64px; opacity: 0.3;">📅</div>
            <p>กรุณาเลือกวันที่และเวลาเพื่อค้นหาห้องว่าง</p>
        </div>
    `;
    
    availableRooms = [];
    selectedRoom = null;
    document.getElementById('alertBox').className = 'alert';
    
    showAlert('ล้างข้อมูลการค้นหาเรียบร้อย', 'success', 2000);
}