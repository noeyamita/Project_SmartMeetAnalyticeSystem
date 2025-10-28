<?php
// ตรวจสอบว่ามีการเชื่อมต่อฐานข้อมูลแล้วหรือยัง
if (!isset($conn)) {
    require_once __DIR__ . '/api/database.php';
}

// ดึงจำนวนการแจ้งเตือน
$notification_count = 0;
$booking_pending_count = 0;
$cancellation_count = 0;

if (isset($_SESSION['user_id'])) {
    // ดึงจำนวนการแจ้งเตือน
    $notification_query = "SELECT COUNT(*) as count FROM Notifications WHERE user_id = ? AND is_read = 0";
    $stmt = $conn->prepare($notification_query);
    $stmt->bind_param("i", $_SESSION['user_id']);
    $stmt->execute();
    $notification_result = $stmt->get_result();
    $notification_count = $notification_result->fetch_assoc()['count'];

    // ดึงจำนวนคำขอห้องประชุมที่รออนุมัติ
    $booking_pending_query = "SELECT COUNT(*) as count FROM Bookings WHERE status_id = (SELECT id FROM status WHERE status_name = 'pending')";
    $booking_result = $conn->query($booking_pending_query);
    $booking_pending_count = $booking_result->fetch_assoc()['count'];

    // ดึงจำนวนคำขอยกเลิกที่รอดำเนินการ
    // $cancellation_query = "SELECT COUNT(*) as count FROM Cancellations WHERE status = 'pending'";
    // $cancellation_result = $conn->query($cancellation_query);
    // $cancellation_count = $cancellation_result->fetch_assoc()['count'];
}

// กำหนดหน้าปัจจุบัน
$current_page = basename($_SERVER['PHP_SELF'], '.php');
?>

<link rel="stylesheet" href="../../css/sidebar.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

<div class="sidebar">
    <div class="sidebar-header">
        <i class="fas fa-times-circle"></i>
        <span>menu-admin</span>
    </div>
    
    <nav class="sidebar-nav">
        <a href="dashboard.php" class="nav-item <?php echo ($current_page == 'dashboard') ? 'active' : ''; ?>">
            <i class="fas fa-home"></i>
            <span>ออกห้องประชุม</span>
        </a>
        
        <a href="history.php" class="nav-item <?php echo ($current_page == 'history') ? 'active' : ''; ?>">
            <i class="fas fa-edit"></i>
            <span>ประวัติการจอง</span>
        </a>
        
        <a href="profile.php" class="nav-item <?php echo ($current_page == 'profile') ? 'active' : ''; ?>">
            <i class="fas fa-id-card"></i>
            <span>โปรไฟล์</span>
        </a>
        
        <a href="booking-management.php" class="nav-item <?php echo ($current_page == 'booking-management') ? 'active' : ''; ?>">
            <i class="fas fa-calendar-check"></i>
            <span>การจองเดียว</span>
            <?php if ($booking_pending_count > 0): ?>
                <span class="badge"><?php echo $booking_pending_count; ?></span>
            <?php endif; ?>
        </a>
        
        <a href="room-management.php" class="nav-item <?php echo ($current_page == 'room-management') ? 'active' : ''; ?>">
            <i class="fas fa-th"></i>
            <span>คำขอให้ห้องแนบ</span>
            <?php if ($cancellation_count > 0): ?>
                <span class="badge"><?php echo $cancellation_count; ?></span>
            <?php endif; ?>
        </a>
        
        <a href="equipment.php" class="nav-item <?php echo ($current_page == 'equipment') ? 'active' : ''; ?>">
            <i class="fas fa-toolbox"></i>
            <span>จัดการอีครับ</span>
        </a>
        
        <a href="users.php" class="nav-item <?php echo ($current_page == 'users') ? 'active' : ''; ?>">
            <i class="fas fa-users"></i>
            <span>แบบ/ปิดแนบ users</span>
        </a>
        
        <a href="settings.php" class="nav-item <?php echo ($current_page == 'settings') ? 'active' : ''; ?>">
            <i class="fas fa-cog"></i>
            <span>จัดการห้องประชุม</span>
        </a>
    </nav>
    
    <div class="sidebar-footer">
        <a href="api/logout.php" class="logout-btn">
            <i class="fas fa-sign-out-alt"></i>
            <span>Logout</span>
        </a>
    </div>
</div>