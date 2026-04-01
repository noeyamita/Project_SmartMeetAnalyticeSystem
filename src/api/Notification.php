<?php
require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

define('GMAIL_USER', 'smartmeet.system@gmail.com');
define('GMAIL_PASS', 'pwjlsptzemewystp');
define('NOTI_MAIL_NAME',  'SmartMeet Analytics System');

class NotificationHelper
{
    private $pdo;

    public function __construct()
    {
        $db = new Database();
        $this->pdo = $db->getConnection();
    }

    public function sendNotification($user_id, $booking_id, $type, $message, $email, $subject)
    {
        try {
            $stmt = $this->pdo->prepare("
                INSERT IGNORE INTO Notifications (user_id, booking_id, type, message, is_read, email_sent, sent_at)
                VALUES (?, ?, ?, ?, 0, 0, NOW())
            ");
            $stmt->execute([$user_id, $booking_id, $type, $message]);

            if ($stmt->rowCount() === 0) {
                return true;
            }

            $emailSent = $this->sendEmail($email, $subject, $message);

            if ($emailSent) {
                $this->pdo->prepare("
                    UPDATE Notifications SET email_sent = 1 
                    WHERE user_id = ? AND booking_id = ? AND type = ?
                ")->execute([$user_id, $booking_id, $type]);
            }

            return true;
        } catch (Exception $e) {
            error_log("sendNotification error: " . $e->getMessage());
            return false;
        }
    }

    private function sendEmail($to, $subject, $body)
    {
        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = GMAIL_USER;
            $mail->Password   = GMAIL_PASS;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;
            $mail->CharSet    = 'UTF-8';

            $mail->setFrom(GMAIL_USER, NOTI_MAIL_NAME);
            $mail->addAddress($to);
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $this->buildEmailHTML($body);
            $mail->AltBody = $body;

            $mail->send();
            return true;
        } catch (Exception $e) {
            error_log("sendEmail error: " . $mail->ErrorInfo);
            return false;
        }
    }

    private function buildEmailHTML($body)
    {
        $htmlBody = nl2br(htmlspecialchars($body));

        return "
        <div style='font-family: Sarabun, sans-serif; max-width: 600px; margin: auto; 
                    border: 1px solid #ddd; border-radius: 8px; overflow: hidden;'>
            <div style='background: linear-gradient(135deg, #3b5998, #192f6a); 
                        padding: 20px; text-align: center;'>
                <h2 style='color: white; margin: 0;'>📅 ระบบจองห้องประชุม</h2>
            </div>
            <div style='padding: 24px; background: #fff; line-height: 1.8;'>
                <p style='font-size: 16px; color: #333;'>{$htmlBody}</p>
            </div>
            <div style='background: #f4f6fb; padding: 12px; text-align: center; 
                        font-size: 12px; color: #999;'>
                อีเมลนี้ส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ
            </div>
        </div>";
    }

    private function formatRoom($room_name, $floor_number)
    {
        return $room_name . (!empty($floor_number) ? " ({$floor_number})" : "");
    }

    public function notifyDisplaced($booking_id, $displaced_room_id)
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    b.booking_id, b.user_id, b.booking_date,
                    b.start_time, b.end_time, b.purpose,
                    u.email, u.fname, u.lname,
                    mr.room_name AS displaced_room_name,
                    mr.floor_number AS displaced_floor
                FROM Bookings b
                JOIN users u ON b.user_id = u.user_id
                JOIN Meeting_Rooms mr ON mr.room_id = ?
                WHERE b.booking_id = ?
            ");
            $stmt->execute([$displaced_room_id, $booking_id]);
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$booking) return false;

            $date     = date('d/m/Y', strtotime($booking['booking_date']));
            $start    = substr($booking['start_time'], 0, 5);
            $end      = substr($booking['end_time'], 0, 5);
            $fullName = $booking['fname'] . ' ' . $booking['lname'];
            $room     = $this->formatRoom($booking['displaced_room_name'], $booking['displaced_floor']);

            $message = "เรียน คุณ{$fullName}\n\n"
                . "การจองของคุณถูกย้ายออกจากห้องประชุม\n"
                . "หัวข้อ: {$booking['purpose']}\n"
                . "วันที่: {$date}\n"
                . "เวลา: {$start} - {$end}\n"
                . "ย้ายจาก: {$room}\n"
                . "กรุณาติดต่อผู้ดูแลระบบเพื่อจัดห้องประชุมใหม่";

            return $this->sendNotification(
                $booking['user_id'],
                $booking_id,
                'room_moved',
                $message,
                $booking['email'],
                "แจ้งเตือน: การจองของคุณถูกย้ายออกจากห้อง - {$date}"
            );
        } catch (Exception $e) {
            error_log("notifyDisplaced error: " . $e->getMessage());
            return false;
        }
    }

    public function notifyRoomMoved($booking_id)
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    b.booking_id, b.user_id, b.booking_date,
                    b.start_time, b.end_time, b.purpose,
                    u.email, u.fname, u.lname,
                    mr_old.room_name AS old_room_name,
                    mr_old.floor_number AS old_floor,
                    mr_new.room_name AS new_room_name,
                    mr_new.floor_number AS new_floor
                FROM Bookings b
                JOIN users u ON b.user_id = u.user_id
                LEFT JOIN Meeting_Rooms mr_old ON b.original_room_id = mr_old.room_id
                LEFT JOIN Meeting_Rooms mr_new ON b.room_id = mr_new.room_id
                WHERE b.booking_id = ?
            ");
            $stmt->execute([$booking_id]);
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$booking) return false;

            $date        = date('d/m/Y', strtotime($booking['booking_date']));
            $start       = substr($booking['start_time'], 0, 5);
            $end         = substr($booking['end_time'], 0, 5);
            $fullName    = $booking['fname'] . ' ' . $booking['lname'];
            $oldRoomName = $this->formatRoom($booking['old_room_name'] ?? 'ไม่ระบุ', $booking['old_floor']);
            $newRoomName = $this->formatRoom($booking['new_room_name'] ?? 'ไม่ระบุ', $booking['new_floor']);

            $message = "เรียน คุณ{$fullName}\n\n"
                . "การจองของคุณถูกย้ายห้องประชุม\n"
                . "หัวข้อ: {$booking['purpose']}\n"
                . "วันที่: {$date}\n"
                . "เวลา: {$start} - {$end}\n"
                . "ย้ายจาก: {$oldRoomName}\n"
                . "ไปยัง: {$newRoomName}";

            return $this->sendNotification(
                $booking['user_id'],
                $booking_id,
                'room_moved',
                $message,
                $booking['email'],
                "แจ้งเตือน: การจองของคุณถูกย้ายห้อง - {$date}"
            );
        } catch (Exception $e) {
            error_log("notifyRoomMoved error: " . $e->getMessage());
            return false;
        }
    }
}
