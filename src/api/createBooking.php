<?php
session_start();
header('Content-Type: application/json'); 
require_once __DIR__ . '/../config/config.php';

// --- 1. ตรวจสอบการเข้าสู่ระบบ ---
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "ไม่พบ Session User ID กรุณาเข้าสู่ระบบใหม่"]);
    exit;
}

$userId = $_SESSION['user_id'];

// --- 2. รับข้อมูลจาก Frontend (JSON) ---
$data = json_decode(file_get_contents("php://input"), true);

// ✅✅✅ การตรวจสอบความถูกต้องที่เข้มงวดขึ้น ✅✅✅
if (
    !$data || 
    !isset($data['room_id'], $data['start_time'], $data['end_time'], $data['booking_date'], $data['table_layout_id']) // ตรวจสอบ table_layout_id โดยตรง
) {
    echo json_encode(["status" => "error", "message" => "ข้อมูลการจองไม่ครบถ้วน หรือไม่ระบุรูปแบบโต๊ะ"]);
    exit;
}

// 🚩 ตรวจสอบให้แน่ใจว่า table_layout_id ไม่ใช่ค่าว่างหรือ 0
if (empty($data['table_layout_id']) || intval($data['table_layout_id']) <= 0) {
    echo json_encode(["status" => "error", "message" => "รูปแบบโต๊ะไม่ถูกต้อง กรุณาเลือกรูปแบบโต๊ะที่ถูกต้อง"]);
    exit;
}

// ... (ฟังก์ชัน timeToDecimal และ decimalToTime เหมือนเดิม) ...

// แปลง HH:MM String เป็น Decimal Hour เพื่อให้ Database Logic ทำงาน
$bookingStartTimeDecimal = timeToDecimal($data['start_time']);
$bookingEndTimeDecimal = timeToDecimal($data['end_time']);

try {
    $pdo->beginTransaction();

    // --- 4. ดึงข้อมูลและตรวจสอบเวลาเปิด-ปิดห้อง ---
    // ... (โค้ดส่วนนี้เหมือนเดิม) ...

    // --- 5. ตรวจสอบการจองทับซ้อน ---
    // ... (โค้ดส่วนนี้เหมือนเดิม) ...

    // --- 6. เพิ่มการจองหลัก ---
    $stmt = $pdo->prepare("
        INSERT INTO Bookings 
        (user_id, room_id, booking_date, start_time, end_time, purpose, attendees_count, table_layout, status, is_moved, original_room_id, created_at, updated_at)
        VALUES 
        (:user_id, :room_id, :booking_date, :start_time, :end_time, :purpose, :attendees_count, :table_layout, :status, 0, NULL, NOW(), NOW())
    ");
    
    // ✅✅✅ มั่นใจว่าค่าที่ถูกส่งเข้าไปไม่ใช่ NULL ✅✅✅
    $stmt->execute([
        ":user_id" => $userId, 
        ":room_id" => $data['room_id'],
        ":booking_date" => $data['booking_date'],
        ":start_time" => $bookingStartTimeDecimal, 
        ":end_time" => $bookingEndTimeDecimal,     
        ":purpose" => $data['purpose'] ?? ($data['meeting_title'] ?? ''), 
        ":attendees_count" => $data['capacity'] ?? 0, 
        ":table_layout" => $data['table_layout_id'], // ดึงค่า table_layout_id ที่ถูกตรวจสอบแล้ว
        ":status" => 1,
    ]);

    $bookingId = $pdo->lastInsertId();

    // --- 7. เพิ่มข้อมูลอุปกรณ์ (ถ้ามีเลือก) ---
    // ... (โค้ดส่วนนี้เหมือนเดิม) ...
    
    $pdo->commit();

    echo json_encode([
        "status" => "success",
        "message" => "จองห้องสำเร็จ พร้อมบันทึกอุปกรณ์",
        "booking_id" => $bookingId
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>