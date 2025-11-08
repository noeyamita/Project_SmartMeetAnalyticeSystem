// ตั้งค่า API endpoint
const API_URL = '../src/api/room-management.php';

// เก็บข้อมูลห้องทั้งหมด
let Meeting_Rooms = [];
let statuses = [];
let isEditing = false;

// Elements
const roomForm = document.getElementById('roomForm');
const roomTableBody = document.getElementById('roomTableBody');
const searchInput = document.getElementById('searchInput');
const loadingOverlay = document.getElementById('loadingOverlay');
const toast = document.getElementById('toast');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const imageFile = document.getElementById('imageFile');
const imagePreview = document.getElementById('imagePreview');

// โหลดข้อมูลเมื่อเปิดหน้า
document.addEventListener('DOMContentLoaded', () => {
    loadStatuses();
    loadRooms();
    setupEventListeners();
});

// ตั้งค่า Event Listeners
function setupEventListeners() {
    roomForm.addEventListener('submit', handleSubmit);
    cancelBtn.addEventListener('click', resetForm);
    searchInput.addEventListener('input', handleSearch);
    imageFile.addEventListener('change', handleImagePreview);
}

// แสดง Loading
function showLoading() {
    loadingOverlay.classList.add('show');
}

// ซ่อน Loading
function hideLoading() {
    loadingOverlay.classList.remove('show');
}

// แสดง Toast Notification
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// โหลดข้อมูลสถานะ
async function loadStatuses() {
    try {
        const response = await fetch(`${API_URL}?action=getStatus`);
        const data = await response.json();
        
        if (data.success) {
            statuses = data.data;
            populateStatusDropdown();
        }
    } catch (error) {
        console.error('Error loading statuses:', error);
    }
}

// เติมข้อมูลลง dropdown สถานะ
function populateStatusDropdown() {
    const statusSelect = document.getElementById('status');
    statusSelect.innerHTML = statuses.map(status => 
        `<option value="${status.status_id}">${status.status_name}</option>`
    ).join('');
}

// จัดการ Preview รูปภาพ
function handleImagePreview(e) {
    const file = e.target.files[0];
    if (!file) {
        imagePreview.innerHTML = '';
        return;
    }

    // ตรวจสอบขนาดไฟล์ (ไม่เกิน 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showToast('ขนาดไฟล์ต้องไม่เกิน 2MB', 'error');
        e.target.value = '';
        imagePreview.innerHTML = '';
        return;
    }

    // ตรวจสอบประเภทไฟล์
    if (!file.type.startsWith('image/')) {
        showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error');
        e.target.value = '';
        imagePreview.innerHTML = '';
        return;
    }

    // แสดง Preview
    const reader = new FileReader();
    reader.onload = function(event) {
        imagePreview.innerHTML = `
            <img src="${event.target.result}" alt="Preview">
            <button type="button" class="remove-image" onclick="removeImage()">🗑️ ลบรูปภาพ</button>
        `;
    };
    reader.readAsDataURL(file);
}

// ลบรูปภาพ
function removeImage() {
    imageFile.value = '';
    imagePreview.innerHTML = '';
}

// โหลดข้อมูลห้องทั้งหมด
async function loadRooms() {
    showLoading();
    try {
        const response = await fetch(`${API_URL}?action=getAll`);
        const data = await response.json();
        
        if (data.success) {
            Meeting_Rooms = data.data;
            displayRooms(Meeting_Rooms);
        } else {
            showToast(data.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
    } finally {
        hideLoading();
    }
}

// แสดงข้อมูลในตาราง
function displayRooms(roomList) {
    if (roomList.length === 0) {
        roomTableBody.innerHTML = '<tr><td colspan="9" class="text-center">ไม่พบข้อมูลห้องประชุม</td></tr>';
        return;
    }

    roomTableBody.innerHTML = roomList.map(room => {
        const statusInfo = statuses.find(s => s.status_id == room.status);
        const statusName = statusInfo ? statusInfo.status_name : 'ไม่ทราบสถานะ';
        const statusClass = room.status == 1 ? 'status-available' : 'status-unavailable';
        
        const imageCell = room.image_url 
            ? `<img src="${room.image_url}" alt="${room.room_name}" class="room-image" onclick="viewImage('${room.image_url}')">`
            : '-';
        
        return `
        <tr>
            <td>${room.room_id}</td>
            <td>${imageCell}</td>
            <td>${room.room_name}</td>
            <td>${room.capacity}</td>
            <td>${room.room_size}</td>
            <td>${room.floor_number}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${statusName}
                </span>
            </td>
            <td>${formatTime(room.open_time)} - ${formatTime(room.close_time)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editRoom(${room.room_id})">✏️ แก้ไข</button>
                    <button class="btn-delete" onclick="deleteRoom(${room.room_id})">🗑️ ลบ</button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// ดูรูปภาพขนาดใหญ่
function viewImage(imageUrl) {
    window.open(imageUrl, '_blank');
}

// จัดรูปแบบเวลา
function formatTime(time) {
    if (!time) return '-';
    const parts = time.toString().split('.');
    const hours = parts[0].padStart(2, '0');
    const minutes = parts[1] ? (parseFloat('0.' + parts[1]) * 60).toFixed(0).padStart(2, '0') : '00';
    return `${hours}:${minutes}`;
}

// แปลงเวลาจาก input เป็น decimal
function timeToDecimal(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':');
    return parseFloat(hours) + (parseFloat(minutes) / 60);
}

// แปลงเวลาจาก decimal เป็น input format
function decimalToTime(decimal) {
    if (!decimal) return '00:00';
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// ค้นหาห้อง
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredRooms = Meeting_Rooms.filter(room => 
        room.room_name.toLowerCase().includes(searchTerm) ||
        room.floor_number.toLowerCase().includes(searchTerm) ||
        room.capacity.toString().includes(searchTerm)
    );
    displayRooms(filteredRooms);
}

// จัดการการ submit ฟอร์ม
async function handleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('action', isEditing ? 'update' : 'create');
    formData.append('room_name', document.getElementById('roomName').value);
    formData.append('capacity', parseInt(document.getElementById('capacity').value));
    formData.append('room_size', parseFloat(document.getElementById('roomSize').value));
    formData.append('floor_number', document.getElementById('floorNumber').value);
    formData.append('status', parseInt(document.getElementById('status').value));
    formData.append('open_time', timeToDecimal(document.getElementById('openTime').value));
    formData.append('close_time', timeToDecimal(document.getElementById('closeTime').value));
    formData.append('description', document.getElementById('description').value || '');
    
    // เพิ่มไฟล์รูปภาพ
    const imageFileInput = document.getElementById('imageFile');
    if (imageFileInput.files.length > 0) {
        formData.append('image', imageFileInput.files[0]);
    }
    
    if (isEditing) {
        formData.append('room_id', parseInt(document.getElementById('roomId').value));
        await updateRoom(formData);
    } else {
        await createRoom(formData);
    }
}

// เพิ่มห้องใหม่
async function createRoom(formData) {
    showLoading();
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.success) {
            showToast('เพิ่มห้องประชุมสำเร็จ', 'success');
            resetForm();
            loadRooms();
        } else {
            showToast(result.message || 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
    } finally {
        hideLoading();
    }
}

// แก้ไขข้อมูลห้อง
async function updateRoom(formData) {
    showLoading();
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.success) {
            showToast('แก้ไขข้อมูลสำเร็จ', 'success');
            resetForm();
            loadRooms();
        } else {
            showToast(result.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
    } finally {
        hideLoading();
    }
}

// ตั้งค่าฟอร์มสำหรับแก้ไข
function editRoom(roomId) {
    const room = Meeting_Rooms.find(r => r.room_id === roomId);
    if (!room) return;

    isEditing = true;
    formTitle.textContent = 'แก้ไขข้อมูลห้องประชุม';
    submitBtn.innerHTML = '<span class="btn-icon">💾</span> บันทึกการแก้ไข';

    document.getElementById('roomId').value = room.room_id;
    document.getElementById('roomName').value = room.room_name;
    document.getElementById('capacity').value = room.capacity;
    document.getElementById('roomSize').value = room.room_size;
    document.getElementById('floorNumber').value = room.floor_number;
    document.getElementById('status').value = room.status;
    document.getElementById('openTime').value = decimalToTime(room.open_time);
    document.getElementById('closeTime').value = decimalToTime(room.close_time);
    document.getElementById('description').value = room.description || '';
    
    // แสดง Preview รูปภาพเดิม (ถ้ามี)
    if (room.image_url) {
        imagePreview.innerHTML = `
            <img src="${room.image_url}" alt="Current Image">
            <button type="button" class="remove-image" onclick="removeImage()">🗑️ ลบรูปภาพ</button>
        `;
    } else {
        imagePreview.innerHTML = '';
    }

    // เลื่อนไปที่ฟอร์ม
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
}

// ลบห้อง
async function deleteRoom(roomId) {
    if (!confirm('คุณต้องการลบห้องประชุมนี้หรือไม่?')) {
        return;
    }

    showLoading();
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'delete',
                room_id: roomId
            })
        });

        const result = await response.json();
        
        if (result.success) {
            showToast('ลบข้อมูลสำเร็จ', 'success');
            loadRooms();
        } else {
            showToast(result.message || 'เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
    } finally {
        hideLoading();
    }
}

// รีเซ็ตฟอร์ม
function resetForm() {
    isEditing = false;
    roomForm.reset();
    document.getElementById('roomId').value = '';
    formTitle.textContent = 'เพิ่มห้องประชุมใหม่';
    submitBtn.innerHTML = '<span class="btn-icon">💾</span> บันทึก';
    imagePreview.innerHTML = '';
}