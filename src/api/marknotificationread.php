<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$db     = new Database();
$pdo    = $db->getConnection();
$userId = $_SESSION['user_id'];

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? $_POST['action'] ?? 'single';

try {
    if ($action === 'all') {
        // Mark ทั้งหมดว่าอ่านแล้ว
        $stmt = $pdo->prepare("UPDATE Notifications SET is_read = 1 WHERE user_id = ?");
        $stmt->execute([$userId]);
    } else {
        // Mark แค่อันเดียว
        $notificationId = $input['notification_id'] ?? null;
        if (!$notificationId) {
            echo json_encode(['success' => false, 'message' => 'notification_id required']);
            exit;
        }
        $stmt = $pdo->prepare("
            UPDATE Notifications SET is_read = 1 
            WHERE notification_id = ? AND user_id = ?
        ");
        $stmt->execute([$notificationId, $userId]);
    }

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}