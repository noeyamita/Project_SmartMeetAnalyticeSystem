<?php
require_once __DIR__ . '/../config/config.php';

try {
    $pdo->beginTransaction();
    $stmtReset = $pdo->prepare("
        UPDATE users 
        SET cancellation_count = 0
    ");
    $stmtReset->execute();

    $stmtUnban = $pdo->prepare("
        UPDATE users u
        JOIN Ban_Log b ON u.user_id = b.user_id
        SET 
            u.is_banned = 0,
            b.unbanned_date = CURRENT_DATE(),
            b.unbanned_by = NULL
        WHERE 
            u.is_banned = 1
            AND b.unbanned_date IS NULL
            AND b.ban_enddate <= CURRENT_DATE()
    ");
    $stmtUnban->execute();

    $stmtFlag = $pdo->prepare("
        UPDATE users 
        SET cancellation_reset = 1
    ");
    $stmtFlag->execute();

    $pdo->commit();

    echo "Monthly reset + auto unban done\n";

} catch (PDOException $e) {
    $pdo->rollBack();
    error_log("Reset Monthly Error: " . $e->getMessage());
    echo "Error: " . $e->getMessage() . "\n";
}
?>