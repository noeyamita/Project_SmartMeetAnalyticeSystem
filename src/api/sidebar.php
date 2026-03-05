<?php
session_start();

$role_id = $_SESSION['role_id'] ?? 0;
?>

<aside class="main-sidebar">
    <section class="sidebar">
        <ul class="sidebar-menu" data-widget="tree">
            
            <?php
            if ($role_id == 1 || $role_id == 2 || $role_id == 3): ?>
            <li class="nav-item" data-page="booking">
                <a href="BookingMeetingRoom.php">📅 จองห้องประชุม</a>
            </li>

            <li class="nav-item" data-page="profile">
                <a href="profile.php">👤 ข้อมูลส่วนตัว</a>
            </li>

            <?php endif; ?>

            <?php // เงื่อนไข: ถ้าเป็น role 1 หรือ 2 
            if ($role_id == 1 || $role_id == 2): ?>
            <li class="nav-item" data-page="report">
                <a href="report.php">📊 รายงานการดำเนินงาน</a>
            </li>
            
            <?php endif; ?>

            <?php // เงื่อนไข: ถ้าเป็น role 1 เท่านั้น 
            if ($role_id == 1): ?>
            
            <li class="nav-item" data-page="user_management">
                <a href="user_management.php">⭐ จัดการผู้ใช้</a>
            </li>
            
            <li class="nav-item" data-page="system_settings">
                <a href="system_settings.php">⚙️ ตั้งค่าระบบ</a>
            </li>
            
            <?php endif; ?>

            <?php if ($role_id == 1 || $role_id == 2 || $role_id == 3): ?>
            <li class="nav-item" data-page="dashboard">
                <a href="Dashboard.php">📊 Dashboard</a>
            </li>
            <?php endif; ?>

            <?php if ($role_id != 0): // ถ้ามีใครล็อกอินอยู่ ?>
            <li class="nav-item" data-page="logout">
                <a href="logout.php">🚪 ออกจากระบบ</a>
            </li>
            <?php endif; ?>

        </ul>
    </section>
</aside>