<?php
session_start();
require_once __DIR__ . '/../config/config.php';

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$user_id = intval($data['user_id'] ?? 0);
$role_id  = intval($data['role_id'] ?? 0);

if (!$user_id || !$role_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ข้อมูลไม่ครบถ้วน'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $stmt = $pdo->prepare("UPDATE users SET role_id = ? WHERE user_id = ?");
    $stmt->execute([$role_id, $user_id]);

    echo json_encode([
        'success' => true,
        'message' => 'อัปเดต Role สำเร็จ'
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>