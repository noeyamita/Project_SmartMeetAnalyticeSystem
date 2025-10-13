const apiURL = 'api.php';

document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('searchBtn');
    const resetBtn = document.getElementById('resetBtn');
    const roomsContainer = document.getElementById('roomsContainer');

    // modal elements
    const bookingModal = document.getElementById('bookingModal');
    const bookingForm = document.getElementById('bookingForm');
    const equipmentListEl = document.getElementById('equipmentList');
    const modalRoomTitle = document.getElementById('modalRoomTitle');
    const formMessage = document.getElementById('formMessage');

    // init defaults: set today's date
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('date').value = today;

    // search handler
    searchBtn.addEventListener('click', async () => {
        const date = document.getElementById('date').value;
        const start_time = document.getElementById('start_time').value;
        const end_time = document.getElementById('end_time').value;
        const participants = document.getElementById('participants').value || 1;

        if (!date || !start_time || !end_time) {
            alert('กรุณาระบุวันที่ เวลาเริ่มต้น และเวลาสิ้นสุด');
            return;
        }
        if (start_time >= end_time) {
            alert('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด');
            return;
        }

        roomsContainer.innerHTML = '<div class="muted">กำลังค้นหา...</div>';
        const resp = await fetch(`${apiURL}?action=search&date=${encodeURIComponent(date)}&start=${encodeURIComponent(start_time)}&end=${encodeURIComponent(end_time)}&participants=${encodeURIComponent(participants)}`);
        const data = await resp.json();
        renderRooms(data.rooms);
    });

    resetBtn.addEventListener('click', () => {
        document.getElementById('date').value = today;
        document.getElementById('start_time').value = '';
        document.getElementById('end_time').value = '';
        document.getElementById('participants').value = 1;
        document.getElementById('roomsContainer').innerHTML = '';
    });

    function renderRooms(rooms) {
        if (!rooms || rooms.length === 0) {
            roomsContainer.innerHTML = '<div class="muted">ไม่พบข้อมูลห้อง</div>';
            return;
        }
        roomsContainer.innerHTML = '';
        rooms.forEach(r => {
            const card = document.createElement('div');
            card.className = 'room-card';
            card.innerHTML = `
        <div>
          <div class="room-title">${escapeHtml(r.name)}</div>
          <div class="room-cap">ความจุ: ${r.capacity} คน • ชั้น ${r.floor}</div>
        </div>
        <div class="room-status">
          <div><span class="chip ${statusClass(r.status)}"></span> ${statusText(r.status)}</div>
          <div class="room-actions">
            ${r.status === 'available' ? `<button class="btn" data-room='${r.id}'>เลือกห้อง</button>` : ''}
          </div>
        </div>
      `;
            roomsContainer.appendChild(card);
            const btn = card.querySelector('button[data-room]');
            if (btn) {
                btn.addEventListener('click', () => openBookingModal(r));
            }
        });
    }

    function statusClass(st) {
        if (st === 'available') return 'available';
        if (st === 'booked') return 'booked';
        return 'maintenance';
    }
    function statusText(st) {
        if (st === 'available') return 'ห้องว่าง';
        if (st === 'booked') return 'ถูกจอง';
        return 'ปิดปรับปรุง';
    }

    // open booking modal
    async function openBookingModal(room) {
        // fill basic info
        document.getElementById('room_id').value = room.id;
        modalRoomTitle.textContent = `จอง: ${room.name} (ความจุ ${room.capacity})`;

        // populate booking date/time with the search values so user doesn't need to retype
        const date = document.getElementById('date').value;
        const start = document.getElementById('start_time').value;
        const end = document.getElementById('end_time').value;
        document.getElementById('book_date').value = date || '';
        document.getElementById('book_start_time').value = start || '';
        document.getElementById('book_end_time').value = end || '';

        // fetch equipment options for this room
        equipmentListEl.innerHTML = 'กำลังโหลดอุปกรณ์...';
        const resp = await fetch(`${apiURL}?action=get_equipment&room_id=${room.id}`);
        const data = await resp.json();
        equipmentListEl.innerHTML = '';
        if (data.equipment && data.equipment.length) {
            data.equipment.forEach(eq => {
                const div = document.createElement('label');
                div.className = 'equipment-item';
                div.innerHTML = `<input type="checkbox" name="equipment" value="${eq.equipment_id}" /> ${escapeHtml(eq.equipment_name)}`;
                equipmentListEl.appendChild(div);
            });
        } else {
            equipmentListEl.innerHTML = '<div class="muted">ไม่มีอุปกรณ์เสริมสำหรับห้องนี้</div>';
        }

        bookingModal.classList.remove('hidden');
    }

    document.getElementById('closeModal').addEventListener('click', () => bookingModal.classList.add('hidden'));
    document.getElementById('cancelBtn').addEventListener('click', () => bookingModal.classList.add('hidden'));

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        formMessage.textContent = '';
        const room_id = document.getElementById('room_id').value;
        const date = document.getElementById('book_date').value;
        const start_time = document.getElementById('book_start_time').value;
        const end_time = document.getElementById('book_end_time').value;
        const phone = document.getElementById('phone').value.trim();
        const title = document.getElementById('title').value.trim();
        const layout = bookingForm.layout.value;

        if (!date || !start_time || !end_time || !phone || !title) {
            formMessage.textContent = 'กรุณากรอกข้อมูลให้ครบถ้วน';
            return;
        }
        if (start_time >= end_time) {
            formMessage.textContent = 'เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด';
            return;
        }
        const equipments = Array.from(bookingForm.querySelectorAll('input[name="equipment"]:checked')).map(i => i.value);

        // send to backend
        const payload = new URLSearchParams();
        payload.append('action', 'book');
        payload.append('room_id', room_id);
        payload.append('date', date);
        payload.append('start', start_time);
        payload.append('end', end_time);
        payload.append('phone', phone);
        payload.append('title', title);
        payload.append('layout', layout);
        equipments.forEach(eid => payload.append('equipment[]', eid));

        const res = await fetch(apiURL, { method: 'POST', body: payload });
        const data = await res.json();
        if (data.success) {
            formMessage.style.color = 'green';
            formMessage.textContent = 'จองสำเร็จ';
            // refresh room list to update status
            document.getElementById('searchBtn').click();
            setTimeout(() => bookingModal.classList.add('hidden'), 800);
        } else {
            formMessage.style.color = 'red';
            formMessage.textContent = data.error || 'เกิดข้อผิดพลาด';
        }
    });

    // utility: simple html escape
    function escapeHtml(s) {
        return (s + '').replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; });
    }
});
