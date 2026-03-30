<?php
session_start();
ini_set('display_errors', 0); 
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';
define('STATUS_SUCCESS', 1);      
define('STATUS_CANCELLED', 2);    
define('STATUS_PENDING', 3);    

try {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode([
            "status" => "error",
            "message" => "Please login first"
        ]);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $bookingId = isset($input['booking_id']) ? intval($input['booking_id']) : 0;
    $userId = $_SESSION['user_id'];
    $stmtBanCheck = $pdo->prepare("SELECT is_banned FROM users WHERE user_id = :user_id");
    $stmtBanCheck->execute(['user_id' => $userId]);
    $userBanStatus = $stmtBanCheck->fetch(PDO::FETCH_ASSOC);
    if ($userBanStatus && $userBanStatus['is_banned'] == 1) {
        echo json_encode([
            "status" => "error",
            "message" => "คุณถูกระงับสิทธิ์การจอง ไม่สามารถยกเลิกการจองได้"
        ]);
        exit;
    }

    if ($bookingId <= 0) {
        echo json_encode([
            "status" => "error",
            "message" => "Invalid booking ID"
        ]);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT booking_id, status, user_id, booking_date, start_time 
        FROM Bookings 
        WHERE booking_id = :booking_id
    ");
    $stmt->execute(['booking_id' => $bookingId]);
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$booking) {
        echo json_encode([
            "status" => "error",
            "message" => "Booking not found"
        ]);
        exit;
    }

    if ($booking['user_id'] != $userId) {
        echo json_encode([
            "status" => "error",
            "message" => "You don't have permission to cancel this booking"
        ]);
        exit;
    }

    if ($booking['status'] == STATUS_CANCELLED) {
        echo json_encode([
            "status" => "error",
            "message" => "การจองนี้ถูกยกเลิกไปแล้ว"
        ]);
        exit;
    }

    $startTime = $booking['start_time']; 
    $bookingDateTime = $booking['booking_date'] . ' ' . $startTime;
    $bookingTimestamp = strtotime($bookingDateTime);
    $currentTimestamp = time();
    if ($currentTimestamp >= $bookingTimestamp) {
        echo json_encode([
            "status" => "error",
            "message" => "ไม่สามารถยกเลิกได้ เนื่องจากเวลาการจองได้ผ่านไปแล้ว"
        ]);
        exit;
    }

    $stmt = $pdo->prepare("
        UPDATE Bookings 
        SET status = :status, updated_at = NOW()
        WHERE booking_id = :booking_id
    ");
    
    $result = $stmt->execute([
        'status' => STATUS_CANCELLED,
        'booking_id' => $bookingId
    ]);

    if ($result) {
        $stmt = $pdo->prepare("
            UPDATE users 
            SET cancellation_count = cancellation_count + 1 
            WHERE user_id = :user_id
        ");
        $stmt->execute(['user_id' => $userId]);
        $role = strtolower($_SESSION['role_name'] ?? 'normal');

        if ($role !== 'admin') {
            
            $checkCancelSql = "SELECT COUNT(*) as month_cancels 
                               FROM Bookings 
                               WHERE user_id = :user_id 
                               AND status = 2 
                               AND MONTH(updated_at) = MONTH(CURRENT_DATE()) 
                               AND YEAR(updated_at) = YEAR(CURRENT_DATE())";
            $stmtCheck = $pdo->prepare($checkCancelSql);
            $stmtCheck->execute(['user_id' => $userId]);
            $cancelData = $stmtCheck->fetch(PDO::FETCH_ASSOC);
            
            $cancelCount = (int)$cancelData['month_cancels'];
   
            if ($cancelCount >= 3) {
                $stmtUser = $pdo->prepare("SELECT is_banned FROM users WHERE user_id = :user_id");
                $stmtUser->execute(['user_id' => $userId]);
                $userStatus = $stmtUser->fetch(PDO::FETCH_ASSOC);

                if ($userStatus && $userStatus['is_banned'] == 0) {
                $banSql = "UPDATE users SET is_banned = 1 WHERE user_id = :user_id";
                $pdo->prepare($banSql)->execute(['user_id' => $userId]);

                $stmtSys = $pdo->prepare("SELECT user_id FROM users WHERE email = 'system@internal' LIMIT 1");
                $stmtSys->execute();
                $systemUser = $stmtSys->fetch(PDO::FETCH_ASSOC);
                $systemUserId = $systemUser ? $systemUser['user_id'] : null;

                $logSql = "INSERT INTO Ban_Log 
                           (user_id, ban_startdate, ban_enddate, ban_reason, banned_by, unbanned_by, unbanned_date) 
                           VALUES 
                           (:user_id, CURRENT_DATE(), LAST_DAY(CURRENT_DATE()), 'ยกเลิกการจองครบ 3 ครั้งในเดือนเดียว (Auto-Ban)', :banned_by, :unbanned_by, LAST_DAY(CURRENT_DATE()))";

                $stmtLog = $pdo->prepare($logSql);
                $stmtLog->execute([
                    'user_id'     => $userId,
                    'banned_by'   => $systemUserId,
                    'unbanned_by' => $systemUserId
                ]);

                echo json_encode([
                    "status" => "banned",
                    "message" => "คุณยกเลิกการจองครบ 3 ครั้งในเดือนนี้ ระบบได้ระงับสิทธิ์การจองของคุณเป็นเวลา 1 เดือน"
                ]);
                exit;
                }
            }
            $remainingQuota = 3 - $cancelCount;
            if ($remainingQuota == 1) {
                echo json_encode([
                    "status" => "warning",
                    "remaining" => $remainingQuota,
                    "message" => "ยกเลิกการจองสำเร็จ!<br><br><i class='fa-solid fa-triangle-exclamation' style='color: #f59e0b;'></i> <b>ระวัง:</b> คุณเหลือโควตายกเลิกได้อีกแค่ 1 ครั้งในเดือนนี้ หากเกินโควตาจะถูกระงับสิทธิ์ทันที"
                ]);
            } else {
                echo json_encode([
                    "status" => "success",
                    "remaining" => $remainingQuota,
                    "message" => "ยกเลิกการจองสำเร็จ!<br><br><span style='font-size: 0.95em; color: #64748b;'><i class='fa-solid fa-circle-info'></i> คุณเหลือสิทธิ์ยกเลิกอีก <b>{$remainingQuota}</b> ครั้งในเดือนนี้</span>"
                ]);
            }
            exit;
        } 
        echo json_encode([
            "status" => "success",
            "message" => "ยกเลิกการจองสำเร็จ"
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "ไม่สามารถยกเลิกการจองได้"
        ]);
    }

} catch (PDOException $e) {
    error_log("Cancel Booking Error: " . $e->getMessage());
    echo json_encode([
        "status" => "error",
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>