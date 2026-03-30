<?php
session_start();
require_once __DIR__ . '/../config/config.php';
header('Content-Type: application/json');
require_once __DIR__ . '/../database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$db  = new Database();
$pdo = $db->getConnection();
$userId = $_SESSION['user_id'];

try {
    $stmt = $pdo->prepare("
        SELECT 
            n.notification_id,
            n.booking_id,
            n.type,
            n.message,
            n.is_read,
            n.sent_at,
            b.purpose,
            b.booking_date,
            b.start_time,
            b.end_time,
            mr.room_name
        FROM Notifications n
        LEFT JOIN Bookings b ON n.booking_id = b.booking_id
        LEFT JOIN Meeting_Rooms mr ON b.room_id = mr.room_id
        WHERE n.user_id = ?
        ORDER BY n.sent_at DESC
        LIMIT 50
    ");
    $stmt->execute([$userId]);
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // นับแจ้งเตือนที่ยังไม่ได้อ่าน
    $unreadStmt = $pdo->prepare("
        SELECT COUNT(*) as unread_count 
        FROM Notifications 
        WHERE user_id = ? AND is_read = 0
    ");
    $unreadStmt->execute([$userId]);
    $unread = $unreadStmt->fetch(PDO::FETCH_ASSOC);

    // แปลง type เป็น label ภาษาไทย
    $typeLabels = [
        'room_moved'   => 'ย้ายห้องประชุม',
        'reminder_24h' => 'แจ้งเตือน 24 ชั่วโมง',
        'reminder_12h' => 'แจ้งเตือน 12 ชั่วโมง',
        'reminder_2h'  => 'แจ้งเตือน 2 ชั่วโมง',
    ];

    foreach ($notifications as &$n) {
        $n['type_label'] = $typeLabels[$n['type']] ?? $n['type'];
        $n['sent_at_thai'] = date('d/m/Y H:i', strtotime($n['sent_at']));
        if ($n['booking_date']) {
            $n['booking_date_thai'] = date('d/m/Y', strtotime($n['booking_date']));
        }
    }

    echo json_encode([
        'success'      => true,
        'data'         => $notifications,
        'unread_count' => (int)$unread['unread_count']
    ]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
