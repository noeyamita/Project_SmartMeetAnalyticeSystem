<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';

$data = json_decode(file_get_contents("php://input"), true);
if (!$data) {
    echo json_encode(["status" => "error", "message" => "Invalid JSON"]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO bookings 
        (user_id, room_id, booking_date, start_time, end_time, purpose, attendees_count, table_layout, status, is_moved, original_room_id, created_at, updated_at)
        VALUES (:user_id, :room_id, :booking_date, :start_time, :end_time, :purpose, :attendees_count, :table_layout, 1, 0, NULL, NOW(), NOW())
    ");

    $stmt->execute([
        ":user_id" => $data['user_id'],
        ":room_id" => $data['room_id'],
        ":booking_date" => $data['booking_date'],
        ":start_time" => $data['start_time'],
        ":end_time" => $data['end_time'],
        ":purpose" => $data['purpose'],
        ":attendees_count" => $data['attendees_count'],
        ":table_layout" => $data['table_layout']
    ]);

    echo json_encode(["status" => "success", "message" => "Booking created successfully"]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
