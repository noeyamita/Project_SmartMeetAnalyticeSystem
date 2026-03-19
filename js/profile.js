const API_BASE = "src/api/";

document.addEventListener('DOMContentLoaded', async () => {
    let bookings = [];
    let isEditingProfile = false;
    let originalFname = '';
    let originalLname = '';
    let originalPhone = '';
    const fullNameInput = document.getElementById('full-name');
    const userEmailInput = document.getElementById('user-email');
    const userPhoneInput = document.getElementById('user-phone');
    const toggleEditInfoBtn = document.getElementById('toggle-edit-info');
    let currentUser = null;
    const editProfileForm = document.getElementById('edit-profile-form');
    const formActionsDiv = editProfileForm.querySelector('.form-actions');
    const emailConfirmationFields = document.getElementById('email-confirmation-fields');
    const passwordForm = document.getElementById('password-form');
    const bookingTableBody = document.querySelector('#booking-table tbody');
    const applyFilterBtn = document.getElementById('apply-filter-btn');
    const filterDateInput = document.getElementById('filter-date');
    const filterStatusSelect = document.getElementById('filter-status');

    //แสดงข้อมูลผู้ใช้
    function displayUserInfo() {
        if (!currentUser) return;

        fullNameInput.value = currentUser.fullName;
        userEmailInput.value = currentUser.email;
        userPhoneInput.value = currentUser.phone;
        originalFname = currentUser.fname;
        originalLname = currentUser.lname;
        originalPhone = currentUser.phone;
    }

    function revertToEditMode() {
        fullNameInput.disabled = true;
        userEmailInput.disabled = true;
        userPhoneInput.disabled = true;

        toggleEditInfoBtn.textContent = 'Edit Profile';
        toggleEditInfoBtn.classList.add('primary-btn');
        toggleEditInfoBtn.classList.remove('save-btn');
        toggleEditInfoBtn.style.display = 'block';

        const existingCancelButton = editProfileForm.querySelector('.cancel-edit-profile');
        if (existingCancelButton) {
            existingCancelButton.remove();
        }
        emailConfirmationFields.style.display = 'none';
        isEditingProfile = false;
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#ffc107'};
            color: white;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // โหลดข้อมูลผู้ใช้จาก API
    try {
        const userResponse = await fetch(`${API_BASE}getUser.php`);
        const userData = await userResponse.json();

        if (userData.status === 'success') {
            currentUser = {
                userId: userData.data.user_id,
                fullName: `${userData.data.fname} ${userData.data.lname}`,
                fname: userData.data.fname,
                lname: userData.data.lname,
                email: userData.data.email,
                phone: userData.data.phone || '',
                role: userData.data.role_id,
                priorityLevel: userData.data.priority_level,
                isBanned: userData.data.is_banned,
                cancellationCount: userData.data.cancellation_count
            };

            displayUserInfo();
        } else {
            showNotification('ไม่สามารถโหลดข้อมูลผู้ใช้ได้: ' + userData.message, 'error');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }

    // --- Tab Navigation Logic ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');

            if (tabId === 'booking-history') {
                loadBookingHistory();
            }
        });
    });

    // ฟังก์ชันช่วยเคลียร์ช่องรหัสผ่าน
    function clearEmailConfirmation() {
        emailConfirmationFields.style.display = 'none';
        const passwordInput = document.getElementById('confirm-email-password');
        if (passwordInput) passwordInput.value = '';
    }

    // ในฟังก์ชัน revertToEditMode เดิมของคุณ ให้เพิ่ม clearEmailConfirmation() เข้าไปด้วย
    function revertToEditMode() {
        fullNameInput.disabled = true;
        userEmailInput.disabled = true;
        userPhoneInput.disabled = true;

        toggleEditInfoBtn.textContent = 'Edit Profile';
        toggleEditInfoBtn.classList.add('primary-btn');
        toggleEditInfoBtn.classList.remove('save-btn');
        toggleEditInfoBtn.style.display = 'block';

        const existingCancelButton = editProfileForm.querySelector('.cancel-edit-profile');
        if (existingCancelButton) existingCancelButton.remove();

        clearEmailConfirmation(); // เพิ่มบรรทัดนี้
        isEditingProfile = false;
    }

    // 1.แก้ไขข้อมูล (อัปเดตใหม่)
    toggleEditInfoBtn.addEventListener('click', async () => {
        if (!isEditingProfile) {
            originalFname = currentUser.fname;
            originalLname = currentUser.lname;
            originalPhone = currentUser.phone;

            fullNameInput.disabled = false;
            userEmailInput.disabled = false; // เปิดให้แก้ Email
            userPhoneInput.disabled = false;

            toggleEditInfoBtn.textContent = 'Save Changes';
            toggleEditInfoBtn.classList.add('save-btn');
            toggleEditInfoBtn.classList.remove('primary-btn');
            isEditingProfile = true;

            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.textContent = 'Cancel';
            cancelButton.classList.add('btn', 'secondary-btn', 'cancel-edit-profile');
            cancelButton.addEventListener('click', () => {
                fullNameInput.value = currentUser.fullName;
                userEmailInput.value = currentUser.email;
                userPhoneInput.value = currentUser.phone;
                revertToEditMode();
            });
            formActionsDiv.appendChild(cancelButton);

        } else {
            const newFullName = fullNameInput.value.trim();
            const newPhone = userPhoneInput.value.trim();
            const newEmail = userEmailInput.value.trim();
            const nameParts = newFullName.split(' ');

            if (nameParts.length < 2) {
                showNotification('กรุณากรอกชื่อและนามสกุล', 'error');
                return;
            }

            if (!newEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                showNotification('รูปแบบอีเมลไม่ถูกต้อง', 'error');
                return;
            }

            const newFname = nameParts[0];
            const newLname = nameParts.slice(1).join(' ');
            const isEmailChanged = newEmail !== currentUser.email;

            if (newFname === originalFname && newLname === originalLname && newPhone === originalPhone && !isEmailChanged) {
                showNotification('ไม่มีการเปลี่ยนแปลงข้อมูล', 'warning');
                revertToEditMode();
                return;
            }

            let confirmPassword = '';
            if (isEmailChanged) {
                const passwordInput = document.getElementById('confirm-email-password');
                if (emailConfirmationFields.style.display === 'none') {
                    emailConfirmationFields.style.display = 'block';
                    showNotification('กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยันการเปลี่ยนอีเมล', 'warning');
                    passwordInput.focus();
                    return;
                }

                if (!passwordInput.value.trim()) {
                    showNotification('กรุณากรอกรหัสผ่านปัจจุบัน', 'error');
                    passwordInput.focus();
                    return;
                }

                confirmPassword = passwordInput.value;
            }
            const payload = {
                fname: newFname,
                lname: newLname,
                phone: newPhone
            };

            if (isEmailChanged) {
                payload.email = newEmail;
                payload.current_password = confirmPassword;
            }

            try {
                const response = await fetch(`${API_BASE}updateUser.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (result.status === 'success') {
                    currentUser.fname = newFname;
                    currentUser.lname = newLname;
                    currentUser.fullName = newFullName;
                    currentUser.phone = newPhone;
                    if (isEmailChanged) currentUser.email = newEmail;

                    showNotification('อัปเดตข้อมูลสำเร็จ!', 'success');
                    revertToEditMode();
                } else {
                    showNotification(result.message, 'error');
                }
            } catch (error) {
                console.error('Update error:', error);
                showNotification('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
            }
        }
    });

    // 2.เปลี่ยนรหัสผ่าน
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPass = document.getElementById('current-password').value;
        const newPass = document.getElementById('new-password').value;
        const confirmPass = document.getElementById('confirm-password').value;

        if (newPass !== confirmPass) {
            showNotification('รหัสผ่านใหม่ไม่ตรงกัน!', 'error');
            return;
        }
        if (newPass.length < 6) {
            showNotification('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}updatePassword.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    current_password: currentPass,
                    new_password: newPass
                })
            });

            const result = await response.json();

            if (result.status === 'success') {
                showNotification('เปลี่ยนรหัสผ่านสำเร็จ!', 'success');
                passwordForm.reset();
            } else {
                showNotification('เกิดข้อผิดพลาด: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Password update error:', error);
            showNotification('ไม่สามารถเปลี่ยนรหัสผ่านได้', 'error');
        }
    });

    // 3.ประวัติการจอง
    async function loadBookingHistory() {
        try {
            const response = await fetch(`${API_BASE}getUserBookings.php`);
            const result = await response.json();

            if (result.status === 'success') {
                bookings = result.data;
                renderBookings(bookings);
            } else {
                showNotification('ไม่สามารถโหลดประวัติการจองได้: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Load bookings error:', error);
            showNotification('เกิดข้อผิดพลาดในการโหลดประวัติการจอง', 'error');
        }
    }

    // เพิ่ม console.log เพื่อดูข้อมูลที่ได้รับ
    function renderBookings(data) {
        console.log('Booking data:', data); // ดูข้อมูลที่ได้รับ

        bookingTableBody.innerHTML = '';
        if (data.length === 0) {
            bookingTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">ไม่มีประวัติการจอง</td></tr>';
            return;
        }

        data.forEach(booking => {
            console.log('Booking item:', booking); // ดูแต่ละรายการ

            const row = bookingTableBody.insertRow();

            // ลองหาชื่อ field ที่ถูกต้อง
            const statusId = parseInt(
                booking.status_id ||
                booking.booking_status_id ||
                booking.status ||
                1
            );

            console.log('Status ID:', statusId); // ดูว่า statusId เป็นเท่าไหร่

            // แปลง status_id เป็นชื่อสถานะ
            let statusName = 'จองสำเร็จ';
            let statusClass = 'success';

            switch (statusId) {
                case 1:
                    statusName = 'จองสำเร็จ';
                    statusClass = 'success';
                    break;
                case 2:
                    statusName = 'ยกเลิกแล้ว';
                    statusClass = 'cancelled';
                    break;
                case 3:
                    statusName = 'รอยืนยันการชำระเงิน';
                    statusClass = 'pending';
                    break;
                default:
                    statusName = booking.status_name || 'ไม่ทราบสถานะ';
                    statusClass = 'default';
            }

            // ตรวจสอบว่าเวลาผ่านไปแล้วหรือยัง
            const [startTime] = booking.time.split(' - '); // ดึงเวลาเริ่มต้น เช่น "10:00"

            // แปลงวันที่และเวลาเป็น timestamp เพื่อเปรียบเทียบ
            // รูปแบบ: "03/01/2026" + " " + "10:00"
            const [day, month, year] = booking.date.split('/');
            const bookingDateTimeStr = `${year}-${month}-${day} ${startTime}:00`;
            const bookingDateTime = new Date(bookingDateTimeStr);
            const now = new Date();

            console.log('Booking DateTime String:', bookingDateTimeStr);
            console.log('Booking DateTime:', bookingDateTime);
            console.log('Current DateTime:', now);
            console.log('Is Future:', bookingDateTime > now);

            // อนุญาตให้ยกเลิกได้เฉพาะ: สถานะ = จองสำเร็จ (1) และเวลายังไม่ผ่าน
            const canCancel = statusId === 1 && bookingDateTime > now;

            console.log('Booking:', booking.date, booking.time, 'Status:', statusId, 'Can cancel:', canCancel);

            row.innerHTML = `
            <td data-label="ห้อง">${booking.room}</td>
            <td data-label="วันที่">${booking.date}</td>
            <td data-label="เวลา">${booking.time}</td>
            <td data-label="สถานะ"><span class="status status-${statusClass}">${statusName}</span></td>
            <td data-label="ดูรายละเอียด/ยกเลิก" style="white-space: nowrap;">
                <button class="view-details-btn" data-id="${booking.id}">รายละเอียด</button>
                ${canCancel ? `<button class="btn secondary-btn cancel-booking-btn" data-id="${booking.id}">ยกเลิก</button>` : ''}
            </td>
        `;
        });

        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', handleViewDetailsBooking);
        });
        document.querySelectorAll('.cancel-booking-btn').forEach(btn => {
            btn.addEventListener('click', handleCancelBooking);
        });
    }

    function getStatusText(status) {
        const statusMap = {
            'pending': 'รอดำเนินการ',
            'confirmed': 'ยืนยันแล้ว',
            'completed': 'เสร็จสิ้น',
            'cancelled': 'ยกเลิกแล้ว'
        };
        return (statusMap[status] || status).toUpperCase();
    }

    // ฟังก์ชันกรอง
    applyFilterBtn.addEventListener('click', () => {
        const filterDate = filterDateInput.value;
        const filterStatus = filterStatusSelect.value;

        const filtered = bookings.filter(booking => {
            const bookingDateFormatted = booking.date.split('/').reverse().join('-');
            const isDateMatch = !filterDate || bookingDateFormatted === filterDate;
            const isStatusMatch = !filterStatus || booking.status === filterStatus;
            return isDateMatch && isStatusMatch;
        });
        renderBookings(filtered);
    });

    // ดูรายละเอียด
    function handleViewDetailsBooking(event) {
        const bookingId = event.target.dataset.id;
        const booking = bookings.find(b => b.id == bookingId);
        if (booking) {
            alert(`รายละเอียดการจอง:\n\nห้อง: ${booking.room}\nวันที่: ${booking.date}\nเวลา: ${booking.time}\nหัวข้อการประชุม: ${booking.purpose}\nจำนวนคน: ${booking.attendees} คน`);
        }
    }



    // ยกเลิกการจอง
    async function handleCancelBooking(event) {
        const bookingId = parseInt(event.target.dataset.id);
        const booking = bookings.find(b => b.id === bookingId);

        if (!booking) return;

        if (confirm(`ต้องการยกเลิกการจองห้อง ${booking.room} วันที่ ${booking.date} ใช่หรือไม่?`)) {
            try {
                const response = await fetch(`${API_BASE}cancelBooking.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ booking_id: bookingId })
                });

                const result = await response.json();

                if (result.status === 'success') {
                    showNotification('ยกเลิกการจองสำเร็จ', 'success');
                    loadBookingHistory();
                } else {
                    showNotification('ไม่สามารถยกเลิกการจองได้: ' + result.message, 'error');
                }
            } catch (error) {
                console.error('Cancel booking error:', error);
                showNotification('เกิดข้อผิดพลาดในการยกเลิกการจอง', 'error');
            }
        }
    }

    // เริ่มต้นให้แสดงแท็บ Profile
    document.getElementById('tab-profile').click();
});
