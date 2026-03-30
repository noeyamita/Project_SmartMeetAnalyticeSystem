<?php
session_start();
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';

try {
    $query = "
        SELECT 
            b.booking_id, b.booking_date, b.start_time, b.end_time, b.purpose, b.attendees_count,
            u.fname, u.lname,
            r.room_name, r.room_id
        FROM Bookings b
        JOIN users u ON b.user_id = u.user_id
        JOIN Meeting_Rooms r ON b.room_id = r.room_id
        WHERE b.status = 3
        ORDER BY b.booking_date ASC, b.start_time ASC
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($requests as &$req) {
        $overlapStmt = $pdo->prepare("
            SELECT u.fname, u.lname 
            FROM Bookings b
            JOIN users u ON b.user_id = u.user_id
            WHERE b.room_id = ? AND b.booking_date = ? AND b.status = 1
            AND (b.start_time < ? AND b.end_time > ?)
        ");
        $overlapStmt->execute([$req['room_id'], $req['booking_date'], $req['end_time'], $req['start_time']]);
        $currentOwners = $overlapStmt->fetchAll(PDO::FETCH_ASSOC);

        $req['current_owners'] = array_map(function ($owner) {
            return $owner['fname'] . ' ' . $owner['lname'];
        }, $currentOwners);
    }

    echo json_encode(["status" => "success", "data" => $requests]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error"]);
}
