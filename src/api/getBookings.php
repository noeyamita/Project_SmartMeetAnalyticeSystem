<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';

$date = $_GET['date'] ?? null;
if (!$date) {
    echo json_encode(["status" => "error", "message" => "Missing date"]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM Bookings WHERE booking_date = ?");
    $stmt->execute([$date]);
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(["status" => "success", "data" => $bookings]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
