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
                    <a href="BookingMeetingRoom.php"><i class="fa-solid fa-calendar-check"></i> จองห้องประชุม</a>
                </li>

                <li class="nav-item" data-page="profile">
                    <a href="profile.php"><i class="fa-solid fa-user"></i> ข้อมูลส่วนตัว</a>
                </li>

            <?php endif; ?>

            <?php
            if ($role_id == 1 || $role_id == 2): ?>
                <li class="nav-item" data-page="report">
                    <a href="report.php"><i class="fa-solid fa-chart-line"></i> รายงานการดำเนินงาน</a>
                </li>

            <?php endif; ?>

            <?php
            if ($role_id == 1): ?>

                <li class="nav-item" data-page="user_management">
                    <a href="user_management.php"><i class="fa-solid fa-users-gear"></i> จัดการผู้ใช้</a>
                </li>

                <li class="nav-item" data-page="system_settings">
                    <a href="system_settings.php"><i class="fa-solid fa-gear"></i> ตั้งค่าระบบ</a>
                </li>

            <?php endif; ?>

            <?php if ($role_id == 1 || $role_id == 2 || $role_id == 3): ?>
                <li class="nav-item" data-page="dashboard">
                    <a href="Dashboard.php"><i class="fa-solid fa-gauge-high"></i> Dashboard</a>
                </li>
            <?php endif; ?>

            <?php if ($role_id != 0):
            ?>
                <li class="nav-item" data-page="logout">
                    <a href="logout.php"><i class="fa-solid fa-right-from-bracket"></i> ออกจากระบบ</a>
                </li>
            <?php endif; ?>

        </ul>
    </section>
</aside>