<?php
require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/Notification.php';
date_default_timezone_set('Asia/Bangkok');
$db     = new Database();
$pdo    = $db->getConnection();
$helper = new NotificationHelper();
$now = new DateTime();

echo "[" . $now->format('Y-m-d H:i:s') . "] Reminder job started\n";
try {

    //ดึงเฉพาะ booking ที่จะเกิดภายใน 26 ชั่วโมง
    //ลด load databaseและลดการเช็คเวลาซ้ำๆ
    $stmt = $pdo->prepare("
        SELECT 
            b.booking_id,
            b.user_id,
            b.booking_date,
            b.start_time,
            b.end_time,
            b.purpose,
            u.email,
            u.fname,
            u.lname,
            mr.room_name
        FROM Bookings b
        JOIN users u ON b.user_id = u.user_id
        JOIN Meeting_Rooms mr ON b.room_id = mr.room_id
        WHERE b.status = 1
        AND b.booking_date >= CURDATE()
        AND TIMESTAMP(b.booking_date, MAKETIME(FLOOR(b.start_time), (b.start_time - FLOOR(b.start_time))*100, 0))
            BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 26 HOUR)
    ");

    $stmt->execute();
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Found " . count($bookings) . " upcoming bookings\n";
    foreach ($bookings as $booking) {
        try {
            $startRaw = (float) $booking['start_time'];
            $startH   = (int) $startRaw;
            $startM   = (int) round(($startRaw - $startH) * 100);
            $endRaw = (float) $booking['end_time'];
            $endH   = (int) $endRaw;
            $endM   = (int) round(($endRaw - $endH) * 100);
            $meetingDatetime = new DateTime(
                $booking['booking_date'] . ' ' . sprintf('%02d:%02d:00', $startH, $startM)
            );

            $diffHours = ($meetingDatetime->getTimestamp() - $now->getTimestamp()) / 3600;
            $date  = date('d/m/Y', strtotime($booking['booking_date']));
            $start = sprintf('%02d:%02d', $startH, $startM);
            $end   = sprintf('%02d:%02d', $endH, $endM);
            $fullName = $booking['fname'] . ' ' . $booking['lname'];
            $room     = $booking['room_name'];
            $purpose  = $booking['purpose'];
            $bid      = $booking['booking_id'];
            echo "booking_id={$bid} diff=" . number_format($diffHours, 2) . "h\n";

            //เช็คว่ามี notification แล้วหรือยัง
            $exists = function($type) use ($pdo, $booking) {
                $stmt = $pdo->prepare("
                    SELECT 1 FROM Notifications
                    WHERE user_id = ?
                    AND booking_id = ?
                    AND type = ?
                    LIMIT 1
                ");
                $stmt->execute([
                    $booking['user_id'],
                    $booking['booking_id'],
                    $type
                ]);
                return $stmt->fetchColumn();
            };

            //24 ชั่วโมง
            if ($diffHours >= 23.5 && $diffHours < 24.5 && !$exists('reminder_24h')) {

                $message = "เรียน คุณ{$fullName}\n\n"
                         . "แจ้งเตือน: อีก 24 ชั่วโมงจะมีการประชุม\n"
                         . "หัวข้อ: {$purpose}\n"
                         . "วันที่: {$date}\n"
                         . "เวลา: {$start} - {$end}\n"
                         . "ห้อง: {$room}";

                $helper->sendNotification(
                    $booking['user_id'],
                    $bid,
                    'reminder_24h',
                    $message,
                    $booking['email'],
                    "แจ้งเตือน 24 ชั่วโมง: {$purpose}"
                );

                echo "  sent 24h\n";
            }

            //12 ชั่วโมง
            if ($diffHours >= 11.5 && $diffHours < 12.5 && !$exists('reminder_12h')) {
                $message = "เรียน คุณ{$fullName}\n\n"
                         . "แจ้งเตือน: อีก 12 ชั่วโมงจะมีการประชุม\n"
                         . "หัวข้อ: {$purpose}\n"
                         . "วันที่: {$date}\n"
                         . "เวลา: {$start} - {$end}\n"
                         . "ห้อง: {$room}";

                $helper->sendNotification(
                    $booking['user_id'],
                    $bid,
                    'reminder_12h',
                    $message,
                    $booking['email'],
                    "แจ้งเตือน 12 ชั่วโมง: {$purpose}"
                );

                echo "  sent 12h\n";
            }

            //2 ชั่วโมง
            if ($diffHours >= 1.5 && $diffHours < 2.5 && !$exists('reminder_2h')) {

                $message = "เรียน คุณ{$fullName}\n\n"
                         . "แจ้งเตือน: อีก 2 ชั่วโมงจะมีการประชุม\n"
                         . "หัวข้อ: {$purpose}\n"
                         . "วันที่: {$date}\n"
                         . "เวลา: {$start} - {$end}\n"
                         . "ห้อง: {$room}";

                $helper->sendNotification(
                    $booking['user_id'],
                    $bid,
                    'reminder_2h',
                    $message,
                    $booking['email'],
                    "แจ้งเตือน 2 ชั่วโมง: {$purpose}"
                );

                echo "  sent 2h\n";
            }

        } catch (Exception $e) {
            echo "Error booking_id=" . $booking['booking_id'] . " : "
               . $e->getMessage() . "\n";
        }
    }

} catch (Exception $e) {
    echo "Job failed: " . $e->getMessage() . "\n";
}
echo "[" . date('H:i:s') . "] Reminder job finished\n";