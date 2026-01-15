<?php
session_start();
require_once __DIR__ . '/../config/config.php';
header("Content-Type: application/json");

// ตรวจสอบการล็อกอิน
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "error",
        "message" => "กรุณาเข้าสู่ระบบ"
    ]);
    exit;
}

// ฟังก์ชันแปลง Decimal -> HH:MM
function decimalToTime($decimal) {
    if ($decimal === null) return null;
    
    $hours = floor($decimal);
    $minutes = round(($decimal - $hours) * 100);
    
    return sprintf("%02d:%02d", $hours, $minutes);
}

// ฟังก์ชันแปลงวันที่เป็นภาษาไทย
function formatThaiDate($date, $currentDate) {
    $bookingDate = new DateTime($date);
    $today = new DateTime($currentDate);
    $tomorrow = clone $today;
    $tomorrow->modify('+1 day');

    if ($bookingDate->format('Y-m-d') === $today->format('Y-m-d')) {
        return 'วันนี้';
    } elseif ($bookingDate->format('Y-m-d') === $tomorrow->format('Y-m-d')) {
        return 'พรุ่งนี้';
    } else {
        return $bookingDate->format('d/m/Y');
    }
}

try {
    $userId = $_SESSION['user_id'];
    $currentDate = date('Y-m-d');
    $currentHour = intval(date('H'));
    $currentMinute = intval(date('i'));
    $currentTime = $currentHour + ($currentMinute / 100);

    // Query - ดึงการจองที่กำลังจะมาถึง (ยังไม่เริ่ม)
    $query = "
        SELECT 
            b.booking_id,
            b.booking_date,
            b.start_time,
            b.end_time,
            b.purpose,
            r.room_name,
            r.floor_number
        FROM Bookings b
        INNER JOIN Meeting_Rooms r ON b.room_id = r.room_id
        WHERE b.user_id = ?
        AND b.status = 1
        AND (
            b.booking_date > ?
            OR (b.booking_date = ? AND b.start_time > ?)
        )
        ORDER BY b.booking_date ASC, b.start_time ASC
        LIMIT 5
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute([$userId, $currentDate, $currentDate, $currentTime]);
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // แปลงข้อมูล
    $result = [];
    foreach ($bookings as $booking) {
        $result[] = [
            'booking_id' => $booking['booking_id'],
            'booking_date' => $booking['booking_date'],
            'booking_date_thai' => formatThaiDate($booking['booking_date'], $currentDate),
            'start_time' => decimalToTime($booking['start_time']),
            'end_time' => decimalToTime($booking['end_time']),
            'room_name' => $booking['room_name'],
            'purpose' => $booking['purpose']
        ];
    }

    echo json_encode([
        "status" => "success",
        "data" => $result
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log("PDO Error in getUpcomingBookings: " . $e->getMessage());
    echo json_encode([
        "status" => "error",
        "message" => "Database Error: " . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    error_log("Error in getUpcomingBookings: " . $e->getMessage());
    echo json_encode([
        "status" => "error",
        "message" => "Error: " . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>