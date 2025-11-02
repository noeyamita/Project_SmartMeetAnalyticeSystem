<?php
session_start();
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: http://localhost:5500");
header("Access-Control-Allow-Credentials: true");

// --- 1. ตรวจสอบว่ามีการเข้าสู่ระบบแล้วหรือไม่ ---
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "error", 
        "message" => "ไม่พบ Session User ID กรุณาเข้าสู่ระบบใหม่"
    ]);
    exit;
}

// กำหนดตัวแปร user_id ที่จะใช้
$userId = $_SESSION['user_id'];

error_reporting(0);
ini_set('display_errors', 0);

header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';

$data = json_decode(file_get_contents("php://input"), true);
if (!$data || !isset($data['room_id'], $data['start_time'], $data['end_time'])) {
    echo json_encode(["status" => "error", "message" => "Invalid or missing JSON data"]);
    exit;
}

// แปลงเวลาจาก "09:00:00" เป็น 9.00
function timeToDecimal($time) {
    if (is_numeric($time)) {
        return floatval($time); 
    }
    // ถ้าเป็นรูปแบบ string time เช่น "09:00:00"
    if (strpos($time, ':') !== false) {
        list($hour, $minute) = explode(':', $time);
        return floatval($hour) + (floatval($minute) / 60);
    }
    return 0.0; // ค่าเริ่มต้นถ้าแปลงไม่ได้
}

// แปลงเวลาเริ่มต้นและสิ้นสุดที่รับมาจากผู้ใช้ (จาก "HH:MM:SS" เป็น Decimal)
$bookingStartTimeDecimal = timeToDecimal($data['start_time']);
$bookingEndTimeDecimal = timeToDecimal($data['end_time']);

//ตรวจสอบเงื่อนไขเวลาเปิด-ปิดห้อง และ การจองที่ทับซ้อน 
try {
    //ดึงเวลาเปิด-ปิดของห้อง
    $roomStmt = $pdo->prepare("
        SELECT open_time, close_time 
        FROM Meeting_Rooms 
        WHERE room_id = :room_id
    ");
    $roomStmt->execute([":room_id" => $data['room_id']]);
    $roomInfo = $roomStmt->fetch(PDO::FETCH_ASSOC);

    if (!$roomInfo) {
        echo json_encode(["status" => "error", "message" => "Room not found."]);
        exit;
    }

    $roomStartTime = floatval($roomInfo['open_time']);
    $roomEndTime = floatval($roomInfo['close_time']);

    //ตรวจสอบว่าเวลาที่จองอยู่ภายในช่วงเวลาเปิด-ปิดของห้องหรือไม่
    //start_time ต้อง >= open_time และ end_time ต้อง <= close_time
    if ($bookingStartTimeDecimal < $roomStartTime || $bookingEndTimeDecimal > $roomEndTime) {
        echo json_encode([
            "status" => "error", 
            "message" => "การจองอยู่นอกเวลาทำการของห้องประชุม (" . $roomInfo['open_time'] . " - " . $roomInfo['close_time'] . ")"
        ]);
        exit;
    }

    //ตรวจสอบการจองที่ทับซ้อนในห้องเดิมในช่วงเวลาเดียวกัน
    //ใช้ตาราง Bookings และเงื่อนไขการทับซ้อน: (A.start < B.end) AND (A.end > B.start)
    $overlapStmt = $pdo->prepare("
        SELECT COUNT(*) 
        FROM Bookings 
        WHERE room_id = :room_id 
        AND booking_date = :booking_date 
        AND status = 1 -- เฉพาะการจองที่ 'Active' (status 1)
        AND (
            (start_time < :end_time AND end_time > :start_time)
        )
    ");

    $overlapStmt->execute([
        ":room_id" => $data['room_id'],
        ":booking_date" => $data['booking_date'],
        ":start_time" => $bookingStartTimeDecimal,
        ":end_time" => $bookingEndTimeDecimal
    ]);

    if ($overlapStmt->fetchColumn() > 0) {
        echo json_encode(["status" => "error", "message" => "ช่องเวลาที่เลือกถูกจองแล้ว."]);
        exit;
    }

    //เพิ่มการจองหากผ่านการตรวจสอบทั้งหมดแล้ว
    $stmt = $pdo->prepare("
        INSERT INTO Bookings 
        (user_id, room_id, booking_date, start_time, end_time, purpose, attendees_count, table_layout, status, is_moved, original_room_id, created_at, updated_at)
        VALUES (:user_id, :room_id, :booking_date, :start_time, :end_time, :purpose, :attendees_count, :table_layout, 1, 0, NULL, NOW(), NOW())
    ");

    $stmt->execute([
        ":user_id" => $userId, 
        ":room_id" => $data['room_id'],
        ":booking_date" => $data['booking_date'],
        ":start_time" => $bookingStartTimeDecimal, 
        ":end_time" => $bookingEndTimeDecimal,   
        ":purpose" => $data['purpose'],
        ":attendees_count" => $data['attendees_count'],
        ":table_layout" => $data['table_layout']
    ]);

    echo json_encode(["status" => "success", "message" => "การจองสำเร็จ"]);
} catch (PDOException $e) {
    // ในกรณีที่เกิดข้อผิดพลาดจากฐานข้อมูล
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>