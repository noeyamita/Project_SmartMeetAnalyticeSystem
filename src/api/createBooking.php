<?php
ob_start();
session_start();

require_once __DIR__ . '/../config/config.php';
header("Content-Type: application/json");
ini_set('display_errors', 0);
error_reporting(E_ALL);

function canBookByRole($role, $bookingDate)
{
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

function isNotPastTime($booking_date, $booking_time)
{
    $now = new DateTime();
    $bookingDateTime = new DateTime($booking_date . ' ' . $booking_time);
    return $bookingDateTime > $now;
}

function isBookingAtLeast3HoursInAdvance($booking_date, $booking_time)
{
    $now = new DateTime();
    $bookingDateTime = new DateTime($booking_date . ' ' . $booking_time);
    $hoursDiff = ($bookingDateTime->getTimestamp() - $now->getTimestamp()) / 3600;
    return $hoursDiff >= 3;
}

$input = json_decode(file_get_contents("php://input"), true);
$bookingDate = $input['booking_date'] ?? null;
$role = strtolower($_SESSION['role_name'] ?? 'normal');

if (!$bookingDate) {
    echo json_encode(['status' => 'error', 'message' => 'ไม่พบวันที่จอง']);
    exit;
}

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

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "กรุณาเข้าสู่ระบบก่อนทำการจอง"]);
    exit;
}

$user_id = $_SESSION['user_id'];
if ($role !== 'admin') {
    try {
        $checkBanSql = "SELECT u.is_banned, b.ban_id, b.ban_enddate 
                        FROM users u
                        LEFT JOIN Ban_Log b ON u.user_id = b.user_id AND b.unbanned_date IS NULL
                        WHERE u.user_id = :user_id 
                        ORDER BY b.ban_id DESC LIMIT 1";
        $stmtBan = $pdo->prepare($checkBanSql);
        $stmtBan->execute(['user_id' => $user_id]);
        $userData = $stmtBan->fetch(PDO::FETCH_ASSOC);

        if ($userData && $userData['is_banned'] == 1) {
            $today = date("Y-m-d");

            if (!empty($userData['ban_enddate']) && $today >= $userData['ban_enddate']) {
                $pdo->prepare("UPDATE users SET is_banned = 0 WHERE user_id = :user_id")->execute(['user_id' => $user_id]);
                if ($userData['ban_id']) {
                    $pdo->prepare("UPDATE Ban_Log SET unbanned_date = CURRENT_DATE(), unbanned_by = 0 WHERE ban_id = :ban_id")
                        ->execute(['ban_id' => $userData['ban_id']]);
                }
            } else {
                if (!empty($userData['ban_enddate'])) {
                    $end_date_th = date("d/m/Y", strtotime($userData['ban_enddate']));
                    $ban_message = "บัญชีของคุณถูกระงับสิทธิ์การจองชั่วคราว (จะถูกปลดแบนวันที่ $end_date_th)";
                } else {
                    $ban_message = "บัญชีของคุณถูกระงับสิทธิ์การจอง (กรุณาติดต่อผู้ดูแลระบบ)";
                }

                echo json_encode([
                    "status" => "error",
                    "message" => $ban_message
                ]);
                exit;
            }
        }
    } catch (PDOException $e) {
        error_log("Ban Check Error: " . $e->getMessage());
    }
}

try {
    $required_fields = ['room_id', 'booking_date', 'start_time', 'end_time', 'capacity', 'purpose', 'table_layout_id'];
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || empty($input[$field])) {
            echo json_encode(["status" => "error", "message" => "ข้อมูลไม่ครบถ้วน: $field"]);
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

    $today = date('Y-m-d');
    if ($booking_date < $today) {
        echo json_encode(["status" => "error", "message" => "ไม่สามารถจองย้อนหลังได้ กรุณาเลือกวันที่ปัจจุบันหรืออนาคต"]);
        exit;
    }

    if (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $start_time) || !preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $end_time)) {
        echo json_encode(["status" => "error", "message" => "รูปแบบเวลาไม่ถูกต้อง (ต้องเป็น HH:MM)"]);
        exit;
    }

    if (!isNotPastTime($booking_date, $start_time)) {
        echo json_encode(["status" => "error", "message" => "ไม่สามารถจองเวลาที่ผ่านมาแล้วได้ กรุณาเลือกเวลาในอนาคต"]);
        exit;
    }

    if (!isBookingAtLeast3HoursInAdvance($booking_date, $start_time)) {
        echo json_encode(["status" => "error", "message" => "กรุณาจองล่วงหน้าอย่างน้อย 3 ชั่วโมง"]);
        exit;
    }

    if ($start_time >= $end_time) {
        echo json_encode(["status" => "error", "message" => "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น"]);
        exit;
    }

    $start_time .= ':00';
    $end_time   .= ':00';

    $checkCapacity = $pdo->prepare("SELECT room_name, capacity, open_time, close_time FROM Meeting_Rooms WHERE room_id = :room_id");
    $checkCapacity->execute(['room_id' => $room_id]);
    $room = $checkCapacity->fetch(PDO::FETCH_ASSOC);

    if (!$room) {
        echo json_encode(["status" => "error", "message" => "ไม่พบข้อมูลห้องประชุม"]);
        exit;
    }

    if ($capacity > $room['capacity']) {
        echo json_encode(["status" => "error", "message" => "จำนวนผู้เข้าร่วม ({$capacity} คน) เกินความจุของห้อง {$room['room_name']}"]);
        exit;
    }

    if ($start_time < $room['open_time'] || $end_time > $room['close_time']) {
        echo json_encode(["status" => "error", "message" => "เวลานอกเวลาเปิด-ปิดห้อง ({$room['open_time']} - {$room['close_time']})"]);
        exit;
    }

    $checkAvailability = $pdo->prepare("
        SELECT booking_id, start_time, end_time 
        FROM Bookings 
        WHERE room_id = :room_id 
        AND booking_date = :booking_date 
        AND status = 1
    ");
    $checkAvailability->execute(['room_id' => $room_id, 'booking_date' => $booking_date]);
    $existingBookings = $checkAvailability->fetchAll(PDO::FETCH_ASSOC);

    $hasOverlap = false;
    $overlappingIds = [];
    foreach ($existingBookings as $booking) {
        if ($start_time < $booking['end_time'] && $end_time > $booking['start_time']) {
            $hasOverlap = true;
            $overlappingIds[] = $booking['booking_id'];
        }
    }

    $bookingStatus = 1;

    if ($hasOverlap) {
        if ($role === 'normal') {
            echo json_encode(["status" => "error", "message" => "ห้องนี้ถูกจองในช่วงเวลาที่เลือกแล้ว"]);
            exit;
        } elseif ($role === 'executive') {
            $bookingStatus = 3;
        } elseif ($role === 'admin') {
            $bookingStatus = 1;
        }
    }

    $pdo->beginTransaction();

    $displacedBookings = [];
    if ($hasOverlap && $role === 'admin' && count($overlappingIds) > 0) {
        $placeholders = implode(',', array_fill(0, count($overlappingIds), '?'));

        $stmtDetails = $pdo->prepare("SELECT booking_id, attendees_count FROM Bookings WHERE booking_id IN ($placeholders)");
        $stmtDetails->execute($overlappingIds);
        $displacedBookings = $stmtDetails->fetchAll(PDO::FETCH_ASSOC);

        $updateOld = $pdo->prepare("UPDATE Bookings SET status = 4, updated_at = NOW() WHERE booking_id IN ($placeholders)");
        $updateOld->execute($overlappingIds);
    }

    $insertBooking = $pdo->prepare("
        INSERT INTO Bookings 
        (user_id, room_id, booking_date, start_time, end_time, purpose, attendees_count, table_layout, status, created_at, updated_at)
        VALUES 
        (:user_id, :room_id, :booking_date, :start_time, :end_time, :purpose, :attendees_count, :table_layout, :status, NOW(), NOW())
    ");

    $insertBooking->execute([
        'user_id'        => $user_id,
        'room_id'        => $room_id,
        'booking_date'   => $booking_date,
        'start_time'     => $start_time,
        'end_time'       => $end_time,
        'purpose'        => $purpose,
        'attendees_count' => $capacity,
        'table_layout'   => $table_layout_id,
        'status'         => $bookingStatus
    ]);

    $booking_id = $pdo->lastInsertId();

    if (!empty($equipments) && is_array($equipments)) {
        $insertEquipment = $pdo->prepare("
            INSERT INTO Booking_Equipment (booking_id, equipment_id, quantity)
            VALUES (:booking_id, :equipment_id, :quantity)
        ");

        $updateEquipment = $pdo->prepare("
            UPDATE Equipment 
            SET quantity = quantity - 1
            WHERE equipment_id = :equipment_id
            AND quantity >= 1
        ");

        foreach ($equipments as $equipment_id) {
            $eq_id = intval($equipment_id);

            if ($eq_id > 0) {
                $updateEquipment->execute(['equipment_id' => $eq_id]);

                if ($updateEquipment->rowCount() == 0) {
                    throw new Exception("อุปกรณ์ไม่เพียงพอ");
                }

                $insertEquipment->execute([
                    'booking_id'   => $booking_id,
                    'equipment_id' => $eq_id,
                    'quantity'     => 1
                ]);
            }
        }
    }
    $pdo->commit();
    $successMessage = "จองห้องประชุมสำเร็จ";
    if ($bookingStatus === 3 && $role === 'executive') {
        $successMessage = "ส่งคำขอใช้ห้องแทนเรียบร้อยแล้ว รอแอดมินอนุมัติ";
    } elseif ($hasOverlap && $role === 'admin') {
        $successMessage = "จองทับสำเร็จ (การจองเดิมถูกเปลี่ยนสถานะเป็น 'ถูกย้ายห้อง' เรียบร้อยแล้ว)";
    }

    echo json_encode([
        "status"       => "success",
        "message"      => $successMessage,
        "booking_id"   => $booking_id,
        "booking_time" => $start_time . " - " . $end_time,
        "displaced_bookings" => $displacedBookings
    ]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Booking Error: " . $e->getMessage());
    echo json_encode(["status" => "error", "message" => "Database Error: " . $e->getMessage()]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Booking Error: " . $e->getMessage());
    echo json_encode(["status" => "error", "message" => "Error: " . $e->getMessage()]);
}
