<?php
require_once __DIR__ . '/../database.php';

class NotificationHelper {
    private $pdo;

    public function __construct() {
        $db = new Database();
        $this->pdo = $db->getConnection();
    }

    // ส่ง Notification ทั้ง in-app และ email
    public function sendNotification($user_id, $booking_id, $type, $message, $email, $subject) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT IGNORE INTO Notifications (user_id, booking_id, type, message, is_read, email_sent, sent_at)
                VALUES (?, ?, ?, ?, 0, 0, NOW())
            ");
            $stmt->execute([$user_id, $booking_id, $type, $message]);

            if ($stmt->rowCount() === 0) {
                // ถูก insert ไปแล้ว (duplicate) ข้ามไป
                return true;
            }
            $emailSent = $this->sendEmail($email, $subject, $message);

            if ($emailSent) {
                $updateStmt = $this->pdo->prepare("
                    UPDATE Notifications SET email_sent = 1 
                    WHERE user_id = ? AND booking_id = ? AND type = ?
                ");
                $updateStmt->execute([$user_id, $booking_id, $type]);
            }
            return true;
        } catch (Exception $e) {
            error_log("sendNotification error: " . $e->getMessage());
            return false;
        }
    }

    // ส่ง Email ด้วย PHP mail()
    private function sendEmail($to, $subject, $body) {
        $headers  = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: ระบบจองห้องประชุม <no-reply@yourdomain.com>\r\n";

        $htmlBody = "
        <div style='font-family: Sarabun, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;'>
            <div style='background: linear-gradient(135deg, #3b5998, #192f6a); padding: 20px; text-align: center;'>
                <h2 style='color: white; margin: 0;'>📅 ระบบจองห้องประชุม</h2>
            </div>
            <div style='padding: 24px; background: #fff;'>
                <p style='font-size: 16px; color: #333;'>{$body}</p>
            </div>
            <div style='background: #f4f6fb; padding: 12px; text-align: center; font-size: 12px; color: #999;'>
                อีเมลนี้ส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ
            </div>
        </div>";

        return mail($to, "=?UTF-8?B?" . base64_encode($subject) . "?=", $htmlBody, $headers);
    }

    // 1. แจ้งเตือนทันทีเมื่อถูกย้ายห้อง
    public function notifyRoomMoved($booking_id) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    b.booking_id,
                    b.user_id,
                    b.booking_date,
                    b.start_time,
                    b.end_time,
                    b.purpose,
                    b.room_id,
                    b.original_room_id,
                    u.email,
                    u.fname,
                    u.lname,
                    mr_new.room_name AS new_room_name,
                    mr_old.room_name AS old_room_name
                FROM Bookings b
                JOIN users u ON b.user_id = u.user_id
                JOIN Meeting_Rooms mr_new ON b.room_id = mr_new.room_id
                LEFT JOIN Meeting_Rooms mr_old ON b.original_room_id = mr_old.room_id
                WHERE b.booking_id = ?
            ");
            $stmt->execute([$booking_id]);
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$booking) return false;

            $date     = date('d/m/Y', strtotime($booking['booking_date']));
            $start    = $this->formatTime($booking['start_time']);
            $end      = $this->formatTime($booking['end_time']);
            $fullName = $booking['fname'] . ' ' . $booking['lname'];
            $oldRoom  = $booking['old_room_name'] ?? 'ไม่ระบุ';
            $newRoom  = $booking['new_room_name'];

            $message = "เรียน คุณ{$fullName}\n\n"
                     . "การจองของคุณถูกย้ายห้องประชุม\n"
                     . "หัวข้อ: {$booking['purpose']}\n"
                     . "วันที่: {$date}\n"
                     . "เวลา: {$start} - {$end}\n"
                     . "ย้ายจาก: {$oldRoom}\n"
                     . "ไปยัง: {$newRoom}";

            $subject = "แจ้งเตือน: การจองของคุณถูกย้ายห้อง - {$date}";

            return $this->sendNotification(
                $booking['user_id'],
                $booking_id,
                'room_moved',
                $message,
                $booking['email'],
                $subject
            );
        } catch (Exception $e) {
            error_log("notifyRoomMoved error: " . $e->getMessage());
            return false;
        }
    }

    private function formatTime($decimal) {
        $hours   = floor($decimal);
        $minutes = round(($decimal - $hours) * 60);
        return sprintf('%02d:%02d', $hours, $minutes);
    }
}