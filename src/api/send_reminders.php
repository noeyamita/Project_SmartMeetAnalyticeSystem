<?php
require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../api/Notification.php';
$db     = new Database();
$pdo    = $db->getConnection();
$helper = new NotificationHelper();
$now = new DateTime('now', new DateTimeZone('Asia/Bangkok'));
echo "[" . $now->format('Y-m-d H:i:s') . "] Cron started\n";

// ดึงการจองทั้งหมดที่ยังไม่ถึงเวลา และ status ใช้งาน
$stmt = $pdo->prepare("
    SELECT 
        b.booking_id,
        b.user_id,
        b.booking_date,
        b.start_time,
        b.end_time,
        b.purpose,
        b.room_id,
        u.email,
        u.fname,
        u.lname,
        mr.room_name
    FROM Bookings b
    JOIN users u ON b.user_id = u.user_id
    JOIN Meeting_Rooms mr ON b.room_id = mr.room_id
    WHERE b.status = 1
      AND CONCAT(b.booking_date, ' ', 
            LPAD(FLOOR(b.start_time), 2, '0'), ':',
            LPAD(ROUND((b.start_time - FLOOR(b.start_time)) * 60), 2, '0'), ':00'
          ) > NOW()
      AND CONCAT(b.booking_date, ' ', 
            LPAD(FLOOR(b.start_time), 2, '0'), ':',
            LPAD(ROUND((b.start_time - FLOOR(b.start_time)) * 60), 2, '0'), ':00'
          ) <= DATE_ADD(NOW(), INTERVAL 25 HOUR)
");
$stmt->execute();
$bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($bookings) . " upcoming bookings\n";

foreach ($bookings as $booking) {
    // คำนวณ datetime ของการประชุม
    $hours   = floor($booking['start_time']);
    $minutes = round(($booking['start_time'] - $hours) * 60);
    $meetingDatetime = new DateTime(
        $booking['booking_date'] . ' ' . sprintf('%02d:%02d:00', $hours, $minutes),
        new DateTimeZone('Asia/Bangkok')
    );

    // คำนวณชั่วโมงที่เหลือก่อนเริ่มการประชุม
    $diffSeconds = $meetingDatetime->getTimestamp() - $now->getTimestamp();
    $diffHours   = $diffSeconds / 3600;

    $date     = date('d/m/Y', strtotime($booking['booking_date']));
    $start    = sprintf('%02d:%02d', $hours, $minutes);
    $endH     = floor($booking['end_time']);
    $endM     = round(($booking['end_time'] - $endH) * 60);
    $end      = sprintf('%02d:%02d', $endH, $endM);
    $fullName = $booking['fname'] . ' ' . $booking['lname'];
    $room     = $booking['room_name'];
    $purpose  = $booking['purpose'];
    $bid      = $booking['booking_id'];

    //24 ชั่วโมง
    if ($diffHours >= 23.5 && $diffHours < 24.5) {
        $message = "เรียน คุณ{$fullName}\n\n"
                 . "แจ้งเตือน: อีก 24 ชั่วโมงจะมีการประชุม\n"
                 . "หัวข้อ: {$purpose}\n"
                 . "วันที่: {$date}\n"
                 . "วลา: {$start} - {$end}\n"
                 . "ห้อง: {$room}";

        $result = $helper->sendNotification(
            $booking['user_id'], $bid, 'reminder_24h', $message,
            $booking['email'], "แจ้งเตือน 24 ชั่วโมง: {$purpose} - {$date}"
        );
        echo "  [24h] booking_id={$bid} => " . ($result ? "✅ sent" : "⚠️ skipped/failed") . "\n";
    }

    //12 ชั่วโมง
    if ($diffHours >= 11.5 && $diffHours < 12.5) {
        $message = "เรียน คุณ{$fullName}\n\n"
                 . "แจ้งเตือน: อีก 12 ชั่วโมงจะมีการประชุม\n"
                 . "หัวข้อ: {$purpose}\n"
                 . "วันที่: {$date}\n"
                 . "เวลา: {$start} - {$end}\n"
                 . "ห้อง: {$room}";

        $result = $helper->sendNotification(
            $booking['user_id'], $bid, 'reminder_12h', $message,
            $booking['email'], "แจ้งเตือน 12 ชั่วโมง: {$purpose} - {$date}"
        );
        echo "  [12h] booking_id={$bid} => " . ($result ? "✅ sent" : "⚠️ skipped/failed") . "\n";
    }

    //2 ชั่วโมง
    if ($diffHours >= 1.5 && $diffHours < 2.5) {
        $message = "เรียน คุณ{$fullName}\n\n"
                 . "แจ้งเตือน: อีก 2 ชั่วโมงจะมีการประชุม\n"
                 . "หัวข้อ: {$purpose}\n"
                 . "วันที่: {$date}\n"
                 . "เวลา: {$start} - {$end}\n"
                 . "ห้อง: {$room}";

        $result = $helper->sendNotification(
            $booking['user_id'], $bid, 'reminder_2h', $message,
            $booking['email'], "แจ้งเตือน 2 ชั่วโมง: {$purpose} - {$date}"
        );
        echo "  [2h] booking_id={$bid} => " . ($result ? "sent" : "skipped/failed") . "\n";
    }
}

echo "[" . (new DateTime())->format('H:i:s') . "] Cron finished\n";