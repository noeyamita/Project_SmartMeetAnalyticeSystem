<?php
session_start();
require_once __DIR__ . '/../database.php';

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

$database = new Database();
$pdo = $database->getConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}
if (!isset($_SESSION['user_id']) || !isset($_SESSION['role_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'กรุณาเข้าสู่ระบบก่อน'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SESSION['role_id'] != 1) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'คุณไม่มีสิทธิ์ดำเนินการนี้'], JSON_UNESCAPED_UNICODE);
    exit;
}

$admin_id = (int) $_SESSION['user_id'];
$input     = json_decode(file_get_contents("php://input"), true);
$target_id = intval($input['user_id'] ?? 0);
$is_banned = intval($input['is_banned'] ?? 0);
$reason    = trim($input['reason'] ?? '');
$today     = date('Y-m-d');

if (!$target_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'user_id ไม่ถูกต้อง'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($target_id === $admin_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ไม่สามารถแบนตัวเองได้'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $checkStmt = $pdo->prepare("SELECT role_id FROM users WHERE user_id = ?");
    $checkStmt->execute([$target_id]);
    $targetUser = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$targetUser) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'ไม่พบผู้ใช้'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($targetUser['role_id'] == 1 && $is_banned == 1) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ไม่สามารถแบน Admin ได้'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $pdo->beginTransaction();
    $pdo->prepare("UPDATE users SET is_banned = ? WHERE user_id = ?")
        ->execute([$is_banned ? 1 : 0, $target_id]);

    if ($is_banned == 1) {
        $pdo->prepare("
            INSERT INTO Ban_Log (user_id, ban_startdate, ban_enddate, ban_reason, banned_by, unbanned_by, unbanned_date)
            VALUES (?, ?, '9999-12-31', ?, ?, ?, ?)
        ")->execute([
            $target_id,
            $today,
            $reason !== '' ? $reason : 'ไม่ระบุเหตุผล',
            $admin_id,
            $admin_id,
            $today,
        ]);
    } else {
        $updated = $pdo->prepare("
            UPDATE Ban_Log
            SET    ban_enddate   = ?,
                   unbanned_by   = ?,
                   unbanned_date = ?
            WHERE  user_id    = ?
              AND  ban_enddate = '9999-12-31'
            ORDER BY ban_id DESC
            LIMIT 1
        ");
        $updated->execute([$today, $admin_id, $today, $target_id]);
        if ($updated->rowCount() === 0) {
            $pdo->prepare("
                INSERT INTO Ban_Log (user_id, ban_startdate, ban_enddate, ban_reason, banned_by, unbanned_by, unbanned_date)
                VALUES (?, ?, ?, 'ไม่ทราบเหตุผล (ปลดแบนโดย Admin)', ?, ?, ?)
            ")->execute([$target_id, $today, $today, $admin_id, $admin_id, $today]);
        }
    }

    $pdo->commit();

    $actionLabel = $is_banned ? 'แบน' : 'ปลดแบน';
    echo json_encode([
        'success'   => true,
        'message'   => "{$actionLabel}ผู้ใช้เรียบร้อยแล้ว",
        'user_id'   => $target_id,
        'is_banned' => $is_banned,
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
