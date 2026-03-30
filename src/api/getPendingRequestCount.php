<?php
session_start();
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';

try {
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM Bookings WHERE status = 3");
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "count" => (int)$result['count']
    ]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "count" => 0]);
}
