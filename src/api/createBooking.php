<?php
ob_start();
session_start();

require_once __DIR__ . '/../config/config.php';
header("Content-Type: application/json");
ini_set('display_errors', 0);
error_reporting(E_ALL);

function timeToDecimal($time) {
    if (empty($time)) return null;
    
    $parts = explode(':', $time);
    $hours = intval($parts[0]);
    $minutes = isset($parts[1]) ? intval($parts[1]) : 0;

    return floatval(sprintf("%.2f", $hours + ($minutes / 100)));
}

function canBookByRole($role, $bookingDate) {
    $today = new DateTime('today');
    $booking = new DateTime($bookingDate);

    switch ($role) {
        case 'admin':
            return true;

        case 'executive':
            $limit = (clone $today)->modify('+1 month');
            return $booking <= $limit;

        case 'normal':
            $limit = (clone $today)->modify('+14 days');
            return $booking <= $limit;

        default:
            return false;
    }
}

function isTimeOverlap($start1, $end1, $start2, $end2) {
    return ($start1 < $end2 && $end1 > $start2);
}

function isNotPastTime($booking_date, $booking_time) {
    $now = new DateTime();
    $bookingDateTime = new DateTime($booking_date . ' ' . $booking_time);
    
    return $bookingDateTime > $now;
}

function isBookingAtLeast3HoursInAdvance($booking_date, $booking_time) {
    $now = new DateTime();
    $bookingDateTime = new DateTime($booking_date . ' ' . $booking_time);

    // แก้ไข: คำนวณจาก timestamp โดยตรง เพื่อความแม่นยำ
    $hoursDiff = ($bookingDateTime->getTimestamp() - $now->getTimestamp()) / 3600;

    return $hoursDiff >= 3;
}

// ===== อ่าน php://input แค่ครั้งเดียว =====
$input = json_decode(file_get_contents("php://input"), true);
$bookingDate = $input['booking_date'] ?? null;
$role = strtolower($_SESSION['role_name'] ?? 'normal');;

// เช็ควันที่ก่อน
if (!$bookingDate) {
    echo json_encode([
        'status' => 'error',
        'message' => 'ไม่พบวันที่จอง'
    ]);
    exit;
}

// เช็คสิทธิ์ตาม role
if (!canBookByRole($role, $bookingDate)) {
    echo json_encode([
        'status' => 'error',
        'message' => match ($role) {
            'executive' => 'Executive สามารถจองล่วงหน้าได้ไม่เกิน 1 เดือน',
            'normal'    => 'ผู้ใช้ทั่วไปสามารถจองล่วงหน้าได้ไม่เกิน 2 สัปดาห์',
            default     => 'ไม่มีสิทธิ์จอง'
        }
    ]);
    exit;
}

// เช็ค login
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "error",
        "message" => "กรุณาเข้าสู่ระบบก่อนทำการจอง"
    ]);
    exit;
}

try {
    // ใช้ $input ที่อ่านไปแล้วด้านบน ไม่ต้องอ่านซ้ำ
    $required_fields = ['room_id', 'booking_date', 'start_time', 'end_time', 'capacity', 'purpose', 'table_layout_id'];
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || empty($input[$field])) {
            echo json_encode([
                "status" => "error",
                "message" => "ข้อมูลไม่ครบถ้วน: $field"
            ]);
            exit;
        }
    }

    $room_id        = intval($input['room_id']);
    $booking_date   = $input['booking_date'];
    $start_time     = $input['start_time'];
    $end_time       = $input['end_time'];
    $capacity       = intval($input['capacity']);
    $purpose        = trim($input['purpose']);
    $table_layout_id = intval($input['table_layout_id']);
    $equipments     = $input['equipments'] ?? [];
    $user_id        = $_SESSION['user_id'];

    // เช็คย้อนหลัง
    $today = date('Y-m-d');
    if ($booking_date < $today) {
        echo json_encode([
            "status" => "error",
            "message" => "ไม่สามารถจองย้อนหลังได้ กรุณาเลือกวันที่ปัจจุบันหรืออนาคต"
        ]);
        exit;
    }

    // เช็ครูปแบบเวลา
    if (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $start_time)) {
        echo json_encode([
            "status" => "error",
            "message" => "รูปแบบเวลาเริ่มต้นไม่ถูกต้อง (ต้องเป็น HH:MM)"
        ]);
        exit;
    }

    if (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $end_time)) {
        echo json_encode([
            "status" => "error",
            "message" => "รูปแบบเวลาสิ้นสุดไม่ถูกต้อง (ต้องเป็น HH:MM)"
        ]);
        exit;
    }

    // เช็คเวลาผ่านไปแล้ว
    if (!isNotPastTime($booking_date, $start_time)) {
        echo json_encode([
            "status" => "error",
            "message" => "⚠️ ไม่สามารถจองเวลาที่ผ่านมาแล้วได้ กรุณาเลือกเวลาในอนาคต"
        ]);
        exit;
    }

    // เช็คจองล่วงหน้า 3 ชั่วโมง
    if (!isBookingAtLeast3HoursInAdvance($booking_date, $start_time)) {
        echo json_encode([
            "status" => "error",
            "message" => "⚠️ กรุณาจองล่วงหน้าอย่างน้อย 3 ชั่วโมง"
        ]);
        exit;
    }

    $start_time_decimal = timeToDecimal($start_time);
    $end_time_decimal   = timeToDecimal($end_time);

    if ($start_time_decimal >= $end_time_decimal) {
        echo json_encode([
            "status" => "error",
            "message" => "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น"
        ]);
        exit;
    }

    $checkCapacity = $pdo->prepare("
        SELECT room_name, capacity, open_time, close_time 
        FROM Meeting_Rooms 
        WHERE room_id = :room_id
    ");
    $checkCapacity->execute(['room_id' => $room_id]);
    $room = $checkCapacity->fetch(PDO::FETCH_ASSOC);

    if (!$room) {
        echo json_encode([
            "status" => "error",
            "message" => "ไม่พบข้อมูลห้องประชุม"
        ]);
        exit;
    }

    if ($capacity > $room['capacity']) {
        echo json_encode([
            "status" => "error",
            "message" => "จำนวนผู้เข้าร่วม ({$capacity} คน) เกินความจุของห้อง {$room['room_name']} (รองรับได้ {$room['capacity']} คน)"
        ]);
        exit;
    }

    $room_open_time  = timeToDecimal($room['open_time']);
    $room_close_time = timeToDecimal($room['close_time']);

    if ($start_time_decimal < $room_open_time || $end_time_decimal > $room_close_time) {
        echo json_encode([
            "status" => "error",
            "message" => "ไม่สามารถจองได้ เนื่องจากเวลาที่เลือกอยู่นอกเวลาเปิด-ปิดของห้อง ({$room['open_time']} - {$room['close_time']})"
        ]);
        exit;
    }

    $checkAvailability = $pdo->prepare("
        SELECT booking_id, start_time, end_time 
        FROM Bookings 
        WHERE room_id = :room_id 
        AND booking_date = :booking_date 
        AND status = 1
    ");
    $checkAvailability->execute([
        'room_id'      => $room_id,
        'booking_date' => $booking_date
    ]);
    $existingBookings = $checkAvailability->fetchAll(PDO::FETCH_ASSOC);

    foreach ($existingBookings as $booking) {
        if (isTimeOverlap($start_time_decimal, $end_time_decimal,
                          $booking['start_time'], $booking['end_time'])) {
            echo json_encode([
                "status" => "error",
                "message" => "ห้องนี้ถูกจองในช่วงเวลาที่เลือกแล้ว"
            ]);
            exit;
        }
    }

    $pdo->beginTransaction();

    $insertBooking = $pdo->prepare("
        INSERT INTO Bookings 
        (user_id, room_id, booking_date, start_time, end_time, purpose, attendees_count, table_layout, status, created_at, updated_at)
        VALUES 
        (:user_id, :room_id, :booking_date, :start_time, :end_time, :purpose, :attendees_count, :table_layout, 1, NOW(), NOW())
    ");

    $insertBooking->execute([
        'user_id'        => $user_id,
        'room_id'        => $room_id,
        'booking_date'   => $booking_date,
        'start_time'     => $start_time_decimal,
        'end_time'       => $end_time_decimal,
        'purpose'        => $purpose,
        'attendees_count'=> $capacity,
        'table_layout'   => $table_layout_id
    ]);

    $booking_id = $pdo->lastInsertId();

    if (!empty($equipments) && is_array($equipments)) {
        $insertEquipment = $pdo->prepare("
            INSERT INTO Booking_Equipment (booking_id, equipment_id)
            VALUES (:booking_id, :equipment_id)
        ");

        foreach ($equipments as $equipment_id) {
            $eq_id = intval($equipment_id);
            if ($eq_id > 0) {
                $insertEquipment->execute([
                    'booking_id'   => $booking_id,
                    'equipment_id' => $eq_id
                ]);
            }
        }
    }

    $pdo->commit();

    echo json_encode([
        "status"       => "success",
        "message"      => "จองห้องประชุมสำเร็จ",
        "booking_id"   => $booking_id,
        "booking_time" => $start_time . " - " . $end_time
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Booking Error: " . $e->getMessage());
    echo json_encode([
        "status"  => "error",
        "message" => "Database Error: " . $e->getMessage()
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Booking Error: " . $e->getMessage());
    echo json_encode([
        "status"  => "error",
        "message" => "Error: " . $e->getMessage()
    ]);
}
?>