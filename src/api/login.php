<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../database.php';

$database = new Database();
$pdo = $database->getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if (empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'กรุณากรอกอีเมลและรหัสผ่าน']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            echo json_encode(['success' => false, 'message' => 'ไม่พบผู้ใช้นี้ในระบบ']);
            exit;
        }

        if (!password_verify($password, $user['user_password'])) {
            echo json_encode(['success' => false, 'message' => 'รหัสผ่านไม่ถูกต้อง']);
            exit;
        }
        if (!empty($user['is_banned']) && $user['is_banned'] == 1) {
            // ดึง ban_enddate ล่าสุดของ user นี้
            $banStmt = $pdo->prepare("
                SELECT ban_enddate, banned_by, ban_reason
                FROM Ban_Log 
                WHERE user_id = ? 
                ORDER BY ban_id DESC 
                LIMIT 1
            ");
            $banStmt->execute([$user['user_id']]);
            $banLog = $banStmt->fetch(PDO::FETCH_ASSOC);

            $today = date('Y-m-d');
            // auto-ban คือมี ban_enddate และไม่ใช่ 9999-12-31 (admin ban ไม่มีวันสิ้นสุด)
            $isAutoban = $banLog && $banLog['ban_enddate'] !== '9999-12-31';

            // ถ้าเป็น auto-ban และถึงวัน ban_enddate แล้ว ให้ปลดแบนอัตโนมัติ
            if ($isAutoban && $banLog['ban_enddate'] <= $today) {
                $pdo->prepare("UPDATE users SET is_banned = 0, cancellation_count = 0, cancellation_reset = 1 WHERE user_id = ?")
                    ->execute([$user['user_id']]);
                $pdo->prepare("UPDATE Ban_Log SET unbanned_date = ? WHERE user_id = ? AND unbanned_date IS NULL")
                    ->execute([$today, $user['user_id']]);
                // ปลดแบนแล้ว ให้ login ผ่านได้ต่อ
            } else {
                // ยังแบนอยู่ — แสดงวันที่กลับมาได้ถ้าเป็น auto-ban
                $returnDate = ($isAutoban && !empty($banLog['ban_enddate'])) ? $banLog['ban_enddate'] : '';
                $banReason = !empty($banLog['ban_reason']) ? $banLog['ban_reason'] : '';
                echo json_encode([
                    'success'     => false,
                    'banned'      => true,
                    'return_date' => $returnDate,
                    'ban_reason'  => $banReason,
                    'message'     => 'บัญชีของท่านถูกแบน กรุณาติดต่อแอดมิน'
                ]);
                exit;
            }
        }

        $_SESSION = [];
        session_destroy();
        session_start();
        session_regenerate_id(true);

        $roleStmt = $pdo->prepare("SELECT role_name FROM role WHERE role_id = ?");
        $roleStmt->execute([$user['role_id']]);
        $role = $roleStmt->fetch(PDO::FETCH_ASSOC);

        // สร้าง session หลังเข้าสู่ระบบสำเร็จ
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['fname'] = $user['fname'];
        $_SESSION['lname'] = $user['lname'];
        $_SESSION['role_id'] = $user['role_id'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['role_name'] = $role['role_name'] ?? 'Normal';

        session_regenerate_id(true);
        $roleStmt = $pdo->prepare("SELECT role_name FROM role WHERE role_id = ?");
        $roleStmt->execute([$user['role_id']]);
        $role = $roleStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'message' => 'เข้าสู่ระบบสำเร็จ',
            'role_id' => $user['role_id'],
            'role_name' => $role['role_name'] ?? 'Normal',
            'user_name' => $user['fname'] . ' ' . $user['lname']
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ]);
    }
}
