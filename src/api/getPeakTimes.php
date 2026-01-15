<?php
session_start();
require_once __DIR__ . '/../config/config.php';
header("Content-Type: application/json");

// ฟังก์ชันแปลง Decimal -> HH:MM
function decimalToTime($decimal) {
    if ($decimal === null) return null;
    
    $hours = floor($decimal);
    $minutes = round(($decimal - $hours) * 100);
    
    return sprintf("%02d:%02d", $hours, $minutes);
}

try {
    // กำหนดช่วงเวลา (08:00-11:59, 12:00-15:59, 16:00-19:59)
    $timeRanges = [
        ['start' => 8.00, 'end' => 11.59, 'label' => '08:00 - 12:00'],
        ['start' => 12.00, 'end' => 15.59, 'label' => '12:00 - 16:00'],
        ['start' => 16.00, 'end' => 19.59, 'label' => '16:00 - 20:00']
    ];

    $result = [];

    foreach ($timeRanges as $range) {
        $query = "
            SELECT COUNT(*) as count
            FROM Bookings
            WHERE YEAR(booking_date) = YEAR(CURDATE())
            AND MONTH(booking_date) = MONTH(CURDATE())
            AND status = 1
            AND start_time >= :start_time
            AND start_time < :end_time
        ";

        $stmt = $pdo->prepare($query);
        $stmt->execute([
            'start_time' => $range['start'],
            'end_time' => $range['end']
        ]);

        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        $result[] = [
            'time_range' => $range['label'],
            'booking_count' => $data['count']
        ];
    }

    // เรียงตามจำนวนมากไปน้อย
    usort($result, function($a, $b) {
        return $b['booking_count'] - $a['booking_count'];
    });

    echo json_encode([
        "status" => "success",
        "data" => $result
    ]);

} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    echo json_encode([
        "status" => "error",
        "message" => "เกิดข้อผิดพลาดในการดึงข้อมูล"
    ]);
}
?>