<?php
session_start();

require_once __DIR__ . '/../config/config.php';
header("Content-Type: application/json");

try {
    $stmt = $pdo->query("SELECT tablelayout_id, tablelayout_name FROM table_layout ORDER BY tablelayout_name ASC");
    $layouts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $layouts]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
