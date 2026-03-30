<?php
require_once __DIR__ . '/../config/config.php';

$now = date('Y-m-d H:i:s');
echo "[{$now}] เริ่มตรวจสอบคืนอุปกรณ์...\n";

try {
    $stmt = $pdo->prepare("
        SELECT DISTINCT b.booking_id
        FROM Bookings b
        INNER JOIN Booking_Equipment be ON b.booking_id = be.booking_id
        WHERE b.status = 1
          AND CONCAT(b.booking_date, ' ', b.end_time) < NOW()
          AND b.equipment_returned = 0
    ");
    $stmt->execute();
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($bookings)) {
        echo "ไม่มีการประชุมที่ต้องคืนอุปกรณ์\n";
        exit;
    }

    echo "พบ " . count($bookings) . " การจองที่ต้องคืนอุปกรณ์\n";

    foreach ($bookings as $booking) {
        $booking_id = $booking['booking_id'];

        try {
            $pdo->beginTransaction();
            $stmtEq = $pdo->prepare("
                SELECT equipment_id, quantity 
                FROM Booking_Equipment 
                WHERE booking_id = ?
            ");
            $stmtEq->execute([$booking_id]);
            $equipments = $stmtEq->fetchAll(PDO::FETCH_ASSOC);

            $updateEq = $pdo->prepare("
                UPDATE Equipment 
                SET quantity = quantity + :quantity
                WHERE equipment_id = :equipment_id
            ");

            foreach ($equipments as $eq) {
                $updateEq->execute([
                    'quantity'     => $eq['quantity'],
                    'equipment_id' => $eq['equipment_id']
                ]);
                echo "  คืนอุปกรณ์ ID {$eq['equipment_id']} จำนวน {$eq['quantity']} ชิ้น (booking_id: {$booking_id})\n";
            }

            $pdo->prepare("
                UPDATE Bookings 
                SET equipment_returned = 1, updated_at = NOW()
                WHERE booking_id = ?
            ")->execute([$booking_id]);

            $pdo->commit();
            echo "  ✓ booking_id {$booking_id} คืนอุปกรณ์สำเร็จ\n";
        } catch (Exception $e) {
            $pdo->rollBack();
            echo "  ✗ booking_id {$booking_id} เกิดข้อผิดพลาด: " . $e->getMessage() . "\n";
            error_log("returnEquipment error booking_id={$booking_id}: " . $e->getMessage());
        }
    }

    echo "เสร็จสิ้น\n";
} catch (PDOException $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
    error_log("returnEquipment fatal error: " . $e->getMessage());
}
