<?php
require_once '../database.php';
$database = new Database();
$pdo = $database->getConnection();

header('Content-Type: application/json');

// ===== รับค่าจาก request =====
$date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
$start_time = isset($_GET['start_time']) ? $_GET['start_time'] : null;
$end_time = isset($_GET['end_time']) ? $_GET['end_time'] : null;
$capacity = isset($_GET['capacity']) ? intval($_GET['capacity']) : 0; // ✅ เพิ่มการรับค่าจำนวนคน

// ✅ ดึงข้อมูลห้องที่จุคนได้ตามที่ต้องการ
$sql = "SELECT * FROM Meeting_Rooms";

// ✅ ถ้ามีการระบุจำนวนคน ให้กรองเฉพาะห้องที่จุได้มากกว่าหรือเท่ากับ
if ($capacity > 0) {
    $sql .= " WHERE capacity >= :capacity";
}

$sql .= " ORDER BY room_id ASC";

$stmt = $pdo->prepare($sql);

// ✅ Bind parameter ถ้ามีการกรอง capacity
if ($capacity > 0) {
    $stmt->bindParam(':capacity', $capacity, PDO::PARAM_INT);
}

$stmt->execute();
$rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

$data = [];

// ฟังก์ชันทำความสะอาด URL รูปภาพ
function cleanImagePath($path) {
    if (!$path) return '';
    if (strpos($path, 'http://') === 0 || strpos($path, 'https://') === 0) return $path;
    $path = str_replace(['uploads/rooms/', 'uploads/'], '', $path);
    return 'uploads/rooms/' . ltrim($path, '/');
}

foreach ($rooms as $room) {
    $availability_status = 'available';
    $availability_text = 'ว่าง';

    // ถ้าห้องปิดปรับปรุง
    if ($room['status'] == 3) {
        $availability_status = 'closed';
        $availability_text = 'ปิดปรับปรุง';
    } else {
        // ตรวจสอบว่าห้องนี้ถูกจองในช่วงเวลาที่ผู้ใช้ระบุไหม
        if ($date && $start_time && $end_time) {
            $sqlCheck = "SELECT COUNT(*) 
                         FROM Bookings
                         WHERE room_id = :room_id
                         AND booking_date = :date
                         AND status IN (1, 'confirmed', 'อนุมัติ')
                         AND (
                             (start_time < :end_time AND end_time > :start_time)
                         )";
            $stmtCheck = $pdo->prepare($sqlCheck);
            $stmtCheck->execute([
                ':room_id' => $room['room_id'],
                ':date' => $date,
                ':start_time' => $start_time,
                ':end_time' => $end_time
            ]);

            $isBooked = $stmtCheck->fetchColumn() > 0;

            if ($isBooked) {
                $availability_status = 'booked';
                $availability_text = 'ถูกจอง';
            } elseif ($room['status'] == 2) {
                $availability_status = 'booked';
                $availability_text = 'ถูกจอง';
            }
        } elseif ($room['status'] == 2) {
            $availability_status = 'booked';
            $availability_text = 'ถูกจอง';
        }
    }

    // ทำความสะอาด path รูปภาพ
    $room['image_url'] = cleanImagePath($room['image_url']);

    // เพิ่มข้อมูลใน array
    $data[] = [
        'room_id' => $room['room_id'],
        'room_name' => $room['room_name'],
        'capacity' => $room['capacity'],
        'room_size' => $room['room_size'],
        'floor_number' => $room['floor_number'],
        'status' => $room['status'],
        'image_url' => $room['image_url'],
        'description' => $room['description'],
        'open_time' => $room['open_time'],
        'close_time' => $room['close_time'],
        'availability_status' => $availability_status,
        'availability_text' => $availability_text
    ];
}

// ส่งผลลัพธ์กลับ
echo json_encode([
    'status' => 'success',
    'data' => $data
], JSON_UNESCAPED_UNICODE);