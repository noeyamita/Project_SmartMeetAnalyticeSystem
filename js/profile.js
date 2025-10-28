document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // ข้อมูลจำลอง (Mock Data)
    // ----------------------------------------------------
    let currentUser = {
        fullName: "Alex Doe",
        email: "alex.doe@example.com"
    };

    let bookings = [
        { id: 101, room: 'Aquila', date: '24/10/2025', time: '19:31 - 21:31', status: 'completed' },
        { id: 102, room: 'Lyra', date: '25/10/2025', time: '19:31 - 22:31', status: 'completed' },
        { id: 103, room: 'Aries', date: '26/10/2025', time: '10:00 - 12:00', status: 'pending' },
        { id: 104, room: 'Cygnus', date: '27/10/2025', time: '14:00 - 16:00', status: 'cancelled' },
    ];
    // ----------------------------------------------------

    // --- Tab Navigation Logic ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to the clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');

            // Render booking history if that tab is active
            if (tabId === 'booking-history') {
                renderBookings(bookings);
            }
        });
    });

    // ----------------------------------------------------
    // 1. ฟีเจอร์แก้ไขข้อมูลส่วนตัว (ชื่อ-นามสกุล, อีเมล)
    // ----------------------------------------------------
    const fullNameInput = document.getElementById('full-name');
    const userEmailInput = document.getElementById('user-email');
    const toggleEditInfoBtn = document.getElementById('toggle-edit-info');
    const editProfileForm = document.getElementById('edit-profile-form');
    const formActionsDiv = editProfileForm.querySelector('.form-actions');
    const emailConfirmationFields = document.getElementById('email-confirmation-fields');
    const newEmailConfirmInput = document.getElementById('new-email-confirm');
    const sendVerificationBtn = document.getElementById('send-verification-btn');

    // ตั้งค่าค่าเริ่มต้นจาก currentUser
    fullNameInput.value = currentUser.fullName;
    userEmailInput.value = currentUser.email;

    let isEditingProfile = false;
    let originalName = currentUser.fullName;
    let originalEmail = currentUser.email;

    // ฟังก์ชันสำหรับสลับโหมดกลับเป็น 'Edit Profile'
    function revertToEditMode() {
        fullNameInput.disabled = true;
        userEmailInput.disabled = true;

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

    toggleEditInfoBtn.addEventListener('click', () => {
        if (!isEditingProfile) {
            // --- โหมดเริ่มแก้ไข (กดปุ่ม 'Edit Profile') ---
            originalName = fullNameInput.value;
            originalEmail = userEmailInput.value;

            fullNameInput.disabled = false;
            userEmailInput.disabled = false;

            toggleEditInfoBtn.textContent = 'Save Changes';
            toggleEditInfoBtn.classList.add('save-btn');
            toggleEditInfoBtn.classList.remove('primary-btn');
            isEditingProfile = true;

            // เพิ่มปุ่ม Cancel ชั่วคราว
            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.textContent = 'Cancel';
            cancelButton.classList.add('btn', 'secondary-btn', 'cancel-edit-profile');
            cancelButton.addEventListener('click', () => {
                fullNameInput.value = originalName;
                userEmailInput.value = originalEmail;
                revertToEditMode();
            });
            formActionsDiv.appendChild(cancelButton);

        } else {
            // --- โหมดบันทึก (กดปุ่ม 'Save Changes') ---
            const newName = fullNameInput.value.trim();
            const newEmail = userEmailInput.value.trim();
            let changesMade = false;

            // 1. จัดการการเปลี่ยนชื่อ
            if (newName !== originalName) {
                // **TODO: ส่งข้อมูลชื่อใหม่ไป Back-end**
                currentUser.fullName = newName;
                originalName = newName; // อัปเดต original
                changesMade = true;
            }

            // 2. จัดการการเปลี่ยนอีเมล (ต้องมีการยืนยัน)
            if (newEmail !== originalEmail) {
                // เปิดฟิลด์ยืนยันอีเมลแทนการบันทึกทันที
                newEmailConfirmInput.value = ''; // ล้างค่าในช่องยืนยัน
                emailConfirmationFields.style.display = 'block';
                toggleEditInfoBtn.style.display = 'none'; // ซ่อนปุ่ม Save Changes

                if (changesMade) {
                    alert(`Profile Name updated successfully to ${newName}. Please confirm the new Email.`);
                } else {
                    alert('Please confirm the new Email address.');
                }
                return; // หยุดการทำงานที่เหลือ
            }

            if (changesMade) {
                alert(`Profile Name updated successfully to ${newName}.`);
            } else {
                alert('No changes made to Name or Email.');
            }

            // จบการแก้ไข (หากไม่มีการเปลี่ยนอีเมล)
            revertToEditMode();
        }
    });

    // ตรรกะการยืนยันอีเมล
    sendVerificationBtn.addEventListener('click', () => {
        const newEmail = userEmailInput.value.trim();
        const newEmailConfirm = newEmailConfirmInput.value.trim();

        if (newEmail !== newEmailConfirm) {
            alert('Email fields do not match! Please confirm the new email correctly.');
            return;
        }

        // **TODO: ส่งอีเมลใหม่ไป Back-end เพื่อให้ระบบส่งลิงก์ยืนยัน**
        alert(`Verification link sent to ${newEmail}. Please check your inbox to complete the change.`);

        // รีเซ็ตสถานะ
        currentUser.email = newEmail;
        originalEmail = newEmail;
        revertToEditMode();
    });


    // ----------------------------------------------------
    // 2. ฟีเจอร์เปลี่ยนรหัสผ่าน
    // ----------------------------------------------------
    const passwordForm = document.getElementById('password-form');

    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const currentPass = document.getElementById('current-password').value;
        const newPass = document.getElementById('new-password').value;
        const confirmPass = document.getElementById('confirm-password').value;

        if (newPass !== confirmPass) {
            alert('New password and confirm password do not match!');
            return;
        }
        if (newPass.length < 6) {
            alert('Password must be at least 6 characters long.');
            return;
        }

        // **TODO: ตรวจสอบรหัสผ่านเดิม และส่งข้อมูลไป Back-end**
        alert('Password change request sent! System will verify your current password.');
        passwordForm.reset();
    });

    // ----------------------------------------------------
    // 3. ฟีเจอร์ประวัติการจองและการจัดการ
    // ----------------------------------------------------
    const bookingTableBody = document.querySelector('#booking-table tbody');
    const applyFilterBtn = document.getElementById('apply-filter-btn');
    const filterDateInput = document.getElementById('filter-date');
    const filterStatusSelect = document.getElementById('filter-status');

    function renderBookings(data) {
        bookingTableBody.innerHTML = '';
        if (data.length === 0) {
            bookingTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No booking history found.</td></tr>';
            return;
        }

        data.forEach(booking => {
            const row = bookingTableBody.insertRow();
            // สำหรับ Responsive: เพิ่ม data-label ใน td
            row.innerHTML = `
                <td data-label="Room">${booking.room}</td>
                <td data-label="Date">${booking.date}</td>
                <td data-label="Time">${booking.time}</td>
                <td data-label="Status"><span class="status ${booking.status}">${booking.status.toUpperCase()}</span></td>
                <td data-label="Actions" style="white-space: nowrap;">
                    <button class="view-details-btn" data-id="${booking.id}">View Details</button>
                    ${booking.status === 'pending' || booking.status === 'confirmed' ?
                    `<button class="btn secondary-btn cancel-booking-btn" data-id="${booking.id}">Cancel</button>` : ''
                }
                </td>
            `;
        });

        // ผูก Event Listener สำหรับปุ่ม
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', handleViewDetailsBooking);
        });
        document.querySelectorAll('.cancel-booking-btn').forEach(btn => {
            btn.addEventListener('click', handleCancelBooking);
        });
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

    // ฟีเจอร์ดูรายละเอียดการจอง
    function handleViewDetailsBooking(event) {
        const bookingId = event.target.dataset.id;
        alert(`Viewing details for booking ID: ${bookingId}`);
    }

    // ฟีเจอร์ยกเลิกการจอง
    function handleCancelBooking(event) {
        const bookingId = parseInt(event.target.dataset.id);
        const booking = bookings.find(b => b.id === bookingId);

        if (!booking) return;

        if (confirm(`Are you sure you want to cancel booking for room ${booking.room} on ${booking.date}?`)) {
            // **TODO: ส่งคำขอไปยัง Back-end เพื่อยกเลิก**

            // อัปเดตข้อมูลจำลอง
            const index = bookings.findIndex(b => b.id === bookingId);
            if (index !== -1) {
                bookings[index].status = 'cancelled';
                alert(`Booking ID: ${bookingId} has been cancelled.`);

                // อัปเดตตารางโดยเรียก filter
                applyFilterBtn.click();
            }
        }
    }

    // เริ่มต้นให้แสดงแท็บ Profile เมื่อโหลดหน้า (เรียกคลิกแท็บแรก)
    document.getElementById('tab-profile').click();
});