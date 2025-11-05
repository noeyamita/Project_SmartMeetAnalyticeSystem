document.addEventListener("DOMContentLoaded", function () {
  // ดึงข้อมูล role จาก sessionStorage
  let userRole = sessionStorage.getItem("userRole");
  
  // ⚠️ Debug: แสดงค่า role ที่ได้
  console.log("🔍 Current userRole:", userRole);
  
  // ถ้าไม่มี role ให้ redirect กลับไปหน้า login
  if (!userRole) {
    console.warn("⚠️ No userRole found! Redirecting to login...");
    // window.location.href = '/login.html'; // uncomment เมื่อต้องการบังคับ login
    userRole = "Admin"; // ค่า default สำหรับทดสอบ
  }
  
  // อัพเดทชื่อ header
  const menuTitle = document.getElementById("menuTitle");
  if (menuTitle) {
    menuTitle.textContent = `Menu ${userRole}`;
  }

  // กรองเมนูตาม role
  const navItems = document.querySelectorAll(".nav-item");
  console.log("📋 Total nav items found:", navItems.length);
  
  navItems.forEach((item) => {
    const allowedRoles = item.getAttribute("data-roles");
    const menuName = item.querySelector("span")?.textContent;
    
    if (allowedRoles) {
      // ตรวจสอบว่า role ของผู้ใช้อยู่ใน allowed roles หรือไม่
      if (!allowedRoles.split(",").includes(userRole)) {
        item.style.display = "none"; // ซ่อนเมนูที่ไม่มีสิทธิ์
        console.log("🚫 Hidden:", menuName);
      } else {
        item.style.display = "flex"; // แสดงเมนูที่มีสิทธิ์
        console.log("✅ Shown:", menuName);
      }
    }
  });

  // จัดการ active state
  let currentPath = "";

  try {
    // ดึง path โหลดใน iframe
    currentPath = window.top.location.pathname;
  } catch (e) {
    // ส่งกลับเป็น path ของตัวเอง
    currentPath = window.location.pathname;
  }

  let currentFile = currentPath.split("/").pop().toLowerCase();
  let pageIdentifier = currentFile.split(".")[0];

  // จัดการกรณีที่ชื่อไฟล์เป็น BookingMeetingRoom.html
  if (pageIdentifier.includes("bookingmeetingroom")) {
    pageIdentifier = "booking";
  }

  // จัดการกรณีที่ path เป็น '/' หรือไม่มีชื่อไฟล์
  if (pageIdentifier === "") {
    pageIdentifier = "booking";
  }

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");

    const dataPage = item.getAttribute("data-page");
    if (!dataPage) return;

    // เปรียบเทียบตัวระบุหน้าปัจจุบัน
    if (pageIdentifier === dataPage) {
      console.log("🎯 Matched data-page:", dataPage);
      item.classList.add("active");
    }
  });
});