<?php
session_start();
require_once __DIR__ . '/../config/config.php';

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $stmt = $pdo->query("
        SELECT 
            u.user_id,
            u.fname,
            u.lname,
            u.email,
            u.role_id,
            u.is_banned,
            COALESCE(r.role_name, 'ไม่ระบุ') AS role_name
        FROM users u
        LEFT JOIN role r ON u.role_id = r.role_id
        ORDER BY u.fname ASC
    ");
    $users = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'users' => $users,
        'count' => count($users)
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>