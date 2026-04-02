<?php
session_start();
header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../config/config.php';

$input = json_decode(file_get_contents('php://input'), true);
$user_id_to_unban = isset($input['user_id']) ? intval($input['user_id']) : 0;
$admin_id = $_SESSION['user_id'];

if ($user_id_to_unban <= 0) {
    echo json_encode(["status" => "error", "message" => "Invalid User ID"]);
    exit;
}

try {
    $pdo->beginTransaction();
    $banStmt = $pdo->prepare("
        SELECT ban_startdate FROM Ban_Log 
        WHERE user_id = :user_id 
        ORDER BY ban_id DESC LIMIT 1
    ");
    $banStmt->execute(['user_id' => $user_id_to_unban]);
    $banLog = $banStmt->fetch(PDO::FETCH_ASSOC);

    $bannedThisMonth = $banLog &&
        date('Y-m', strtotime($banLog['ban_startdate'])) === date('Y-m');

    // ถ้าแบนในเดือนนี้ = ไม่ reset cancellation_count 
    $updateUser = $pdo->prepare("
        UPDATE users 
        SET is_banned = 0,
            cancellation_count = " . ($bannedThisMonth ? "cancellation_count" : "0") . ",
            cancellation_reset = 1
        WHERE user_id = :user_id
    ");
    $updateUser->execute(['user_id' => $user_id_to_unban]);

    $hideBookings = $pdo->prepare("
        UPDATE Bookings 
        SET status = 99 
        WHERE user_id = :user_id 
        AND status = 2 
        AND MONTH(updated_at) = MONTH(CURRENT_DATE())
        AND YEAR(updated_at) = YEAR(CURRENT_DATE())
    ");
    $hideBookings->execute(['user_id' => $user_id_to_unban]);

    $updateBanLog = $pdo->prepare("
        UPDATE Ban_Log 
        SET unbanned_date = CURRENT_DATE(), 
            unbanned_by = :admin_id,
            ban_enddate = CURRENT_DATE()
        WHERE user_id = :user_id 
        AND unbanned_date IS NULL
    ");
    $updateBanLog->execute([
        'admin_id' => $admin_id,
        'user_id'  => $user_id_to_unban
    ]);

    $pdo->commit();

    echo json_encode([
        "status" => "success",
        "message" => "ปลดแบนผู้ใช้สำเร็จ"
    ]);
} catch (Exception $e) {
    $pdo->rollBack();
    error_log("Unban Error: " . $e->getMessage());
    echo json_encode([
        "status" => "error",
        "message" => "เกิดข้อผิดพลาด: " . $e->getMessage()
    ]);
}
