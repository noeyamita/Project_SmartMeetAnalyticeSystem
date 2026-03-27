<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';

$date = $_GET['date'] ?? null;
if (!$date) {
    echo json_encode(["status" => "error", "message" => "Missing date"]);
    exit;
}

function decimalToTime($decimal) {
    if (!is_numeric($decimal)) return null;
    $hours = floor($decimal);
    $minutes = round(($decimal - $hours) * 60); 

    if ($minutes >= 60) {
        $hours += floor($minutes / 60);
        $minutes = $minutes % 60;
    }
    $hours = $hours % 24; 
    
    return sprintf("%02d:%02d", $hours, $minutes);
}

try {
    $stmt = $pdo->prepare("SELECT * FROM Bookings WHERE booking_date = ?");
    $stmt->execute([$date]);
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($bookings as &$booking) {
        $booking['start_time_display'] = decimalToTime($booking['start_time']);
        $booking['end_time_display'] = decimalToTime($booking['end_time']);
    }

    echo json_encode(["status" => "success", "data" => $bookings]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>