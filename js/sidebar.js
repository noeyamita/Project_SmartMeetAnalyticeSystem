document.addEventListener("DOMContentLoaded", function () {
  let currentPath = "";

  try {
    //ดึง path โหลดใน iframe
    currentPath = window.top.location.pathname; 
  } catch (e) {
    //ส่งกลับเป็น path ของตัวเอง
    currentPath = window.location.pathname;
  }

  let currentFile = currentPath.split("/").pop().toLowerCase(); 

  let pageIdentifier = currentFile.split(".")[0]; 

  //จัดการกรณีที่ชื่อไฟล์เป็น BookingMeetingRoom.html
  //เปลี่ยนจาก 'bookingmeetingroom' ให้เป็น 'booking' เพื่อให้ตรงกับ data-page
  if (pageIdentifier.includes("bookingmeetingroom")) { 
      pageIdentifier = "booking"; 
  }

  // จัดการกรณีที่ path เป็น '/' หรือไม่มีชื่อไฟล์
  if (pageIdentifier === "") {
      // กำหนดให้หน้าแรกเป็น 'booking'
      pageIdentifier = "booking"; 
  }

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");

    const dataPage = item.getAttribute("data-page");
    if (!dataPage) return;

    //เปรียบเทียบตัวระบุหน้าปัจจุบัน
    if (pageIdentifier === dataPage) {
      console.log("🎯 Matched data-page:", dataPage);
      item.classList.add("active");
    }
  });
});