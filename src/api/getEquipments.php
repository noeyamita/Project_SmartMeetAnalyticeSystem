<?php
session_start();

require_once __DIR__ . '/../config/config.php';
header("Content-Type: application/json");

try {
    $stmt = $pdo->query("SELECT equipment_id, equipment_name FROM equipment ORDER BY equipment_name ASC");
    $equipments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $equipments]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
