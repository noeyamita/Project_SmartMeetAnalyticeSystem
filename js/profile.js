const API_BASE = "src/api/";

document.addEventListener("DOMContentLoaded", async () => {
  let bookings = [];
  let isEditingProfile = false;
  let originalFname = "";
  let originalLname = "";
  let originalPhone = "";
  const fullNameInput = document.getElementById("full-name");
  const userEmailInput = document.getElementById("user-email");
  const userPhoneInput = document.getElementById("user-phone");
  const toggleEditInfoBtn = document.getElementById("toggle-edit-info");
  let currentUser = null;
  const editProfileForm = document.getElementById("edit-profile-form");
  const formActionsDiv = editProfileForm.querySelector(".form-actions");
  const emailConfirmationFields = document.getElementById(
    "email-confirmation-fields",
  );
  const passwordForm = document.getElementById("password-form");
  const bookingTableBody = document.querySelector("#booking-table tbody");
  const applyFilterBtn = document.getElementById("apply-filter-btn");
  const filterDateInput = document.getElementById("filter-date");
  const filterStatusSelect = document.getElementById("filter-status");

  const ITEMS_PER_PAGE = 20;
  let currentPage = 1;
  let currentFilteredBookings = [];

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

    toggleEditInfoBtn.textContent = "Edit Profile";
    toggleEditInfoBtn.classList.add("primary-btn");
    toggleEditInfoBtn.classList.remove("save-btn");
    toggleEditInfoBtn.style.display = "block";

    const existingCancelButton = editProfileForm.querySelector(
      ".cancel-edit-profile",
    );
    if (existingCancelButton) {
      existingCancelButton.remove();
    }

    clearEmailConfirmation();
    isEditingProfile = false;
  }

  function clearEmailConfirmation() {
    emailConfirmationFields.style.display = "none";
    const passwordInput = document.getElementById("confirm-email-password");
    if (passwordInput) passwordInput.value = "";
  }

  function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === "success" ? "#28a745" : type === "error" ? "#dc3545" : "#ffc107"};
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
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  try {
    const userResponse = await fetch(`${API_BASE}getUser.php`);
    const userData = await userResponse.json();

    if (userData.status === "success") {
      currentUser = {
        userId: userData.data.user_id,
        fullName: `${userData.data.fname} ${userData.data.lname}`,
        fname: userData.data.fname,
        lname: userData.data.lname,
        email: userData.data.email,
        phone: userData.data.phone || "",
        role: userData.data.role_id,
        priorityLevel: userData.data.priority_level,
        isBanned: userData.data.is_banned,
        cancellationCount: userData.data.cancellation_count,
      };

      displayUserInfo();
    } else {
      showNotification(
        "ไม่สามารถโหลดข้อมูลผู้ใช้ได้: " + userData.message,
        "error",
      );
    }
  } catch (error) {
    console.error("Error loading user data:", error);
    showNotification("เกิดข้อผิดพลาดในการโหลดข้อมูล", "error");
  }

  //Tab Navigation
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.dataset.tab;

      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));

      button.classList.add("active");
      document.getElementById(`${tabId}-tab`).classList.add("active");

      if (tabId === "booking-history") {
        loadBookingHistory();
      }
    });
  });

  toggleEditInfoBtn.addEventListener("click", async () => {
    if (!isEditingProfile) {
      originalFname = currentUser.fname;
      originalLname = currentUser.lname;
      originalPhone = currentUser.phone;

      fullNameInput.disabled = false;
      userEmailInput.disabled = false;
      userPhoneInput.disabled = false;

      toggleEditInfoBtn.textContent = "Save Changes";
      toggleEditInfoBtn.classList.add("save-btn");
      toggleEditInfoBtn.classList.remove("primary-btn");
      isEditingProfile = true;

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.textContent = "Cancel";
      cancelButton.classList.add("btn", "secondary-btn", "cancel-edit-profile");
      cancelButton.addEventListener("click", () => {
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
      const nameParts = newFullName.split(" ");

      if (nameParts.length < 2) {
        showNotification("กรุณากรอกชื่อและนามสกุล", "error");
        return;
      }

      if (!newEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        showNotification("รูปแบบอีเมลไม่ถูกต้อง", "error");
        return;
      }

      const newFname = nameParts[0];
      const newLname = nameParts.slice(1).join(" ");
      const isEmailChanged = newEmail !== currentUser.email;

      if (
        newFname === originalFname &&
        newLname === originalLname &&
        newPhone === originalPhone &&
        !isEmailChanged
      ) {
        showNotification("ไม่มีการเปลี่ยนแปลงข้อมูล", "warning");
        revertToEditMode();
        return;
      }

      let confirmPassword = "";
      if (isEmailChanged) {
        const passwordInput = document.getElementById("confirm-email-password");
        if (emailConfirmationFields.style.display === "none") {
          emailConfirmationFields.style.display = "block";
          showNotification(
            "กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยันการเปลี่ยนอีเมล",
            "warning",
          );
          passwordInput.focus();
          return;
        }

        if (!passwordInput.value.trim()) {
          showNotification("กรุณากรอกรหัสผ่านปัจจุบัน", "error");
          passwordInput.focus();
          return;
        }

        confirmPassword = passwordInput.value;
      }
      const payload = {
        fname: newFname,
        lname: newLname,
        phone: newPhone,
      };

      if (isEmailChanged) {
        payload.email = newEmail;
        payload.current_password = confirmPassword;
      }

      try {
        const response = await fetch(`${API_BASE}updateUser.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.status === "success") {
          currentUser.fname = newFname;
          currentUser.lname = newLname;
          currentUser.fullName = newFullName;
          currentUser.phone = newPhone;
          if (isEmailChanged) currentUser.email = newEmail;

          showNotification("อัปเดตข้อมูลสำเร็จ!", "success");
          revertToEditMode();
        } else {
          showNotification(result.message, "error");
        }
      } catch (error) {
        console.error("Update error:", error);
        showNotification("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
      }
    }
  });

  passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPass = document.getElementById("current-password").value;
    const newPass = document.getElementById("new-password").value;
    const confirmPass = document.getElementById("confirm-password").value;

    if (newPass !== confirmPass) {
      showNotification("รหัสผ่านใหม่ไม่ตรงกัน!", "error");
      return;
    }
    if (newPass.length < 6) {
      showNotification("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}updatePassword.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPass,
          new_password: newPass,
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        showNotification("เปลี่ยนรหัสผ่านสำเร็จ!", "success");
        passwordForm.reset();
      } else {
        showNotification("เกิดข้อผิดพลาด: " + result.message, "error");
      }
    } catch (error) {
      console.error("Password update error:", error);
      showNotification("ไม่สามารถเปลี่ยนรหัสผ่านได้", "error");
    }
  });

  async function loadBookingHistory() {
    try {
      const response = await fetch(`${API_BASE}getUserBookings.php`);
      const result = await response.json();

      if (result.status === "success") {
        bookings = result.data;
        currentPage = 1;
        currentFilteredBookings = bookings;
        renderBookings(currentFilteredBookings);
      } else {
        showNotification(
          "ไม่สามารถโหลดประวัติการจองได้: " + result.message,
          "error",
        );
      }
    } catch (error) {
      console.error("Load bookings error:", error);
      showNotification("เกิดข้อผิดพลาดในการโหลดประวัติการจอง", "error");
    }
  }

  function renderBookings(data) {
    bookingTableBody.innerHTML = "";

    if (data.length === 0) {
      bookingTableBody.innerHTML =
        '<tr><td colspan="5" style="text-align: center; padding: 20px;">ไม่มีประวัติการจอง</td></tr>';
      renderPagination(0);
      return;
    }

    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageData = data.slice(startIndex, endIndex);

    pageData.forEach((booking) => {
      const row = bookingTableBody.insertRow();
      const statusId = parseInt(
        booking.status_id || booking.booking_status_id || booking.status || 1,
      );
      let statusName = "ไม่ทราบสถานะ";
      let statusClass = "status-default";

      switch (statusId) {
        case 1:
          statusName = "จองสำเร็จ";
          statusClass = "status-success";
          break;
        case 2:
          statusName = "ยกเลิกการจอง";
          statusClass = "status-cancelled";
          break;
        case 3:
          statusName = "รออนุมัติการย้ายห้อง";
          statusClass = "warning";
          break;
        case 4:
          statusName = "ถูกย้ายห้อง";
          statusClass = "info";
          break;
        case 5:
          statusName = "คำขอถูกปฏิเสธ";
          statusClass = "rejected";
          break;
      }

      const [startTime] = booking.time.split(" - ");
      const [day, month, year] = booking.date.split("/");
      const bookingDateTimeStr = `${year}-${month}-${day} ${startTime}:00`;
      const bookingDateTime = new Date(bookingDateTimeStr);
      const now = new Date();

      const canCancel = statusId === 1 && bookingDateTime > now;

      row.innerHTML = `
            <td data-label="ห้อง">${booking.room}</td>
            <td data-label="วันที่">${booking.date}</td>
            <td data-label="เวลา">${booking.time}</td>
            <td data-label="สถานะ"><span class="status ${statusClass}">${statusName}</span></td>
            <td data-label="ดูรายละเอียด/ยกเลิก" style="white-space: nowrap;">
                <button class="view-details-btn" data-id="${booking.id}">รายละเอียด</button>
                ${canCancel ? `<button class="btn secondary-btn cancel-booking-btn" data-id="${booking.id}">ยกเลิก</button>` : ""}
            </td>
            `;
    });

    document.querySelectorAll(".view-details-btn").forEach((btn) => {
      btn.addEventListener("click", handleViewDetailsBooking);
    });
    document.querySelectorAll(".cancel-booking-btn").forEach((btn) => {
      btn.addEventListener("click", handleCancelBooking);
    });

    renderPagination(data.length);
  }

  function renderPagination(totalItems) {
    const existingPagination = document.querySelector(".pagination-wrapper");
    if (existingPagination) existingPagination.remove();

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return;

    const wrapper = document.createElement("div");
    wrapper.className = "pagination-wrapper";

    const prevBtn = document.createElement("button");
    prevBtn.className = "page-btn";
    prevBtn.innerHTML = "&laquo;";
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderBookings(currentFilteredBookings);
      }
    });
    wrapper.appendChild(prevBtn);
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      const firstBtn = document.createElement("button");
      firstBtn.className = "page-btn";
      firstBtn.textContent = "1";
      firstBtn.addEventListener("click", () => {
        currentPage = 1;
        renderBookings(currentFilteredBookings);
      });
      wrapper.appendChild(firstBtn);
      if (startPage > 2) {
        const dots = document.createElement("span");
        dots.className = "page-dots";
        dots.textContent = "...";
        wrapper.appendChild(dots);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const btn = document.createElement("button");
      btn.className = "page-btn" + (i === currentPage ? " active" : "");
      btn.textContent = i;
      const page = i;
      btn.addEventListener("click", () => {
        currentPage = page;
        renderBookings(currentFilteredBookings);
      });
      wrapper.appendChild(btn);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const dots = document.createElement("span");
        dots.className = "page-dots";
        dots.textContent = "...";
        wrapper.appendChild(dots);
      }
      const lastBtn = document.createElement("button");
      lastBtn.className = "page-btn";
      lastBtn.textContent = totalPages;
      lastBtn.addEventListener("click", () => {
        currentPage = totalPages;
        renderBookings(currentFilteredBookings);
      });
      wrapper.appendChild(lastBtn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.className = "page-btn";
    nextBtn.innerHTML = "&raquo;";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderBookings(currentFilteredBookings);
      }
    });
    wrapper.appendChild(nextBtn);
    const info = document.createElement("span");
    info.className = "pagination-info";
    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);
    info.textContent = `${start}–${end} จาก ${totalItems} รายการ`;
    wrapper.appendChild(info);

    const bookingTable = document.getElementById("booking-table");
    bookingTable.parentNode.insertBefore(wrapper, bookingTable.nextSibling);
  }

  applyFilterBtn.addEventListener("click", () => {
    const filterDate = filterDateInput.value;
    const filterStatus = filterStatusSelect.value;

    const filtered = bookings.filter((booking) => {
      const bookingDateFormatted = booking.date.split("/").reverse().join("-");
      const isDateMatch = !filterDate || bookingDateFormatted === filterDate;
      const isStatusMatch = !filterStatus || booking.status === filterStatus;
      return isDateMatch && isStatusMatch;
    });
    currentPage = 1;
    currentFilteredBookings = filtered;
    renderBookings(currentFilteredBookings);
  });

  function handleViewDetailsBooking(event) {
    const bookingId = event.target.dataset.id;
    const booking = bookings.find((b) => b.id == bookingId);
    if (booking) {
      alert(
        `รายละเอียดการจอง:\n\nห้อง: ${booking.room}\nวันที่: ${booking.date}\nเวลา: ${booking.time}\nหัวข้อการประชุม: ${booking.purpose}\nจำนวนคน: ${booking.attendees} คน`,
      );
    }
  }

  let cancelQuotaRemaining = 3;
  async function handleCancelBooking(event) {
    const bookingId = parseInt(event.target.dataset.id);
    const booking = bookings.find((b) => b.id === bookingId);

    if (!booking) return;

    const isLastChance = cancelQuotaRemaining === 1;
    const confirmResult = await Swal.fire({
      title: isLastChance
        ? '<i class="fa-solid fa-triangle-exclamation" style="color: #e53e3e;"></i> ยืนยันการยกเลิก (ครั้งสุดท้าย!)'
        : "ยืนยันการยกเลิก",
      html: isLastChance
        ? `ต้องการยกเลิกการจองห้อง <b>${booking.room}</b><br>วันที่ ${booking.date} ใช่หรือไม่?<br><br><span style="color:#e53e3e; font-weight:600;"><i class="fa-solid fa-triangle-exclamation"></i> นี่คือโควตาสุดท้ายของเดือนนี้ หากยกเลิกจะถูกระงับสิทธิ์ทันที!</span>`
        : `ต้องการยกเลิกการจองห้อง <b>${booking.room}</b><br>วันที่ ${booking.date} ใช่หรือไม่?`,
      icon: isLastChance ? "error" : "warning",
      showCancelButton: true,
      confirmButtonColor: "#e53e3e",
      cancelButtonColor: "#6c757d",
      confirmButtonText:
        '<i class="fa-solid fa-trash-can"></i> ยืนยัน ยกเลิกการจอง',
      cancelButtonText: "ไม่ใช่",
    });

    if (!confirmResult.isConfirmed) return;

    try {
      const response = await fetch(`${API_BASE}cancelBooking.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId }),
      });

      const result = await response.json();
      if (result.remaining !== undefined) {
        cancelQuotaRemaining = result.remaining;
      }

      if (result.status === "success") {
        await Swal.fire({
          title: "ยกเลิกการจองสำเร็จ",
          html: result.message,
          icon: "success",
          confirmButtonColor: "#5b6de2",
        });
        loadBookingHistory();
      } else if (result.status === "warning") {
        await Swal.fire({
          title: "ยกเลิกการจองสำเร็จ",
          html: result.message,
          icon: "warning",
          confirmButtonColor: "#f59e0b",
        });
        loadBookingHistory();
      } else if (result.status === "banned") {
        await Swal.fire({
          title: "ถูกระงับสิทธิ์การจอง",
          html: result.message,
          icon: "error",
          confirmButtonColor: "#e53e3e",
        });
        loadBookingHistory();
      } else {
        Swal.fire({
          title: "เกิดข้อผิดพลาด",
          html: result.message,
          icon: "error",
          confirmButtonColor: "#e53e3e",
        });
      }
    } catch (error) {
      console.error("Cancel booking error:", error);
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้",
        icon: "error",
        confirmButtonColor: "#e53e3e",
      });
    }
  }

  // เริ่มต้นให้แสดงแท็บ Profile
  document.getElementById("tab-profile").click();
});
