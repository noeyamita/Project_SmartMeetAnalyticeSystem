<?php
session_start();
require_once __DIR__ . '/../config/config.php';

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {

    if (isset($_GET['action']) && $_GET['action'] === 'get_roles') {
        try {
            $stmt = $pdo->query("SELECT role_id, role_name FROM role ORDER BY role_id");
            $roles = $stmt->fetchAll();
            echo json_encode(['success' => true, 'data' => $roles, 'count' => count($roles)], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาดในการดึง roles: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        exit;
    }

    if (isset($_GET['action']) && $_GET['action'] === 'get_permissions') {
        try {
            $stmt = $pdo->query("SELECT permission_id, permission_name, description, created_at FROM permissions");
            $permissions = $stmt->fetchAll();
            echo json_encode(['success' => true, 'data' => $permissions, 'count' => count($permissions)], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาดในการดึง permissions: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        exit;
    }

    if (isset($_GET['action']) && $_GET['action'] === 'get_role_permissions' && isset($_GET['role_id'])) {
        try {
            $role_id = intval($_GET['role_id']);
            $stmt = $pdo->prepare("SELECT permission_id FROM role_permissions WHERE role_id = ?");
            $stmt->execute([$role_id]);
            $permissions = $stmt->fetchAll(PDO::FETCH_COLUMN);
            $permissions = array_map('intval', $permissions);
            echo json_encode(['success' => true, 'data' => $permissions, 'role_id' => $role_id, 'count' => count($permissions)], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาดในการดึง role permissions: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        exit;
    }

    if (isset($_GET['action']) && $_GET['action'] === 'get_role_detail' && isset($_GET['role_id'])) {
        try {
            $role_id = intval($_GET['role_id']);

            $stmt = $pdo->prepare("SELECT role_id, role_name FROM role WHERE role_id = ?");
            $stmt->execute([$role_id]);
            $role = $stmt->fetch();

            if (!$role) {
                echo json_encode(['success' => false, 'message' => 'ไม่พบ role ที่ระบุ'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $stmt = $pdo->prepare("
                SELECT 
                    p.permission_id,
                    p.permission_name
                FROM permissions p
                INNER JOIN role_permissions rp ON p.permission_id = rp.permission_id
                WHERE rp.role_id = ?
                ORDER BY p.permission_id
            ");
            $stmt->execute([$role_id]);
            $permissions = $stmt->fetchAll();

            $role['permissions'] = $permissions;

            echo json_encode(['success' => true, 'data' => $role], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Invalid action or missing parameters'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (isset($_GET['action']) && $_GET['action'] === 'add_role') {
        if (empty($data['role_name'])) {
            echo json_encode(['success' => false, 'message' => 'กรุณากรอกชื่อ Role'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        try {
            $stmt = $pdo->prepare("SELECT role_id FROM role WHERE role_name = ?");
            $stmt->execute([$data['role_name']]);
            if ($stmt->fetch()) {
                echo json_encode(['success' => false, 'message' => 'ชื่อ Role นี้มีอยู่แล้ว'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            $pdo->beginTransaction();
            $stmt = $pdo->query("SELECT COALESCE(MAX(role_id), 0) + 1 as next_id FROM role");
            $result = $stmt->fetch();
            $next_role_id = $result['next_id'];
            $stmt = $pdo->prepare("INSERT INTO role (role_id, role_name) VALUES (?, ?)");
            $stmt->execute([$next_role_id, $data['role_name']]);
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'เพิ่ม Role สำเร็จ', 'role_id' => $next_role_id, 'role_name' => $data['role_name'], 'permissions_count' => 0], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        exit;
    }

    if (isset($_GET['action']) && $_GET['action'] === 'update_role') {
        if (empty($data['role_id']) || empty($data['role_name'])) {
            echo json_encode(['success' => false, 'message' => 'ข้อมูลไม่ครบถ้วน'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        try {
            $stmt = $pdo->prepare("SELECT role_id FROM role WHERE role_name = ? AND role_id != ?");
            $stmt->execute([$data['role_name'], $data['role_id']]);
            if ($stmt->fetch()) {
                echo json_encode(['success' => false, 'message' => 'ชื่อ Role นี้มีอยู่แล้ว'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            $stmt = $pdo->prepare("UPDATE role SET role_name = ? WHERE role_id = ?");
            $stmt->execute([$data['role_name'], $data['role_id']]);
            echo json_encode(['success' => true, 'message' => 'แก้ไข Role สำเร็จ'], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        exit;
    }

    if (isset($_GET['action']) && $_GET['action'] === 'delete_role') {
        if (empty($data['role_id'])) {
            echo json_encode(['success' => false, 'message' => 'ไม่พบ role_id'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        try {
            $role_id = intval($data['role_id']);
            $stmt = $pdo->prepare("SELECT COUNT(*) as user_count FROM users WHERE role_id = ?");
            $stmt->execute([$role_id]);
            $result = $stmt->fetch();
            if ($result['user_count'] > 0) {
                echo json_encode(['success' => false, 'message' => 'ไม่สามารถลบ Role นี้ได้ เนื่องจากมีผู้ใช้ ' . $result['user_count'] . ' คนที่ใช้ Role นี้อยู่'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("DELETE FROM role_permissions WHERE role_id = ?");
            $stmt->execute([$role_id]);
            $stmt = $pdo->prepare("DELETE FROM role WHERE role_id = ?");
            $stmt->execute([$role_id]);
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'ลบ Role สำเร็จ'], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        exit;
    }

    if (empty($data['role_id']) || !isset($data['permissions'])) {
        echo json_encode(['success' => false, 'message' => 'ข้อมูลไม่ครบถ้วน (ต้องมี role_id และ permissions)'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $role_id = intval($data['role_id']);
    $permissions = $data['permissions'];

    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("DELETE FROM role_permissions WHERE role_id = ?");
        $stmt->execute([$role_id]);
        if (!empty($permissions) && is_array($permissions)) {
            $stmt = $pdo->prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
            foreach ($permissions as $permission_id) {
                $stmt->execute([$role_id, intval($permission_id)]);
            }
        }
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'บันทึกสิทธิ์สำเร็จ', 'role_id' => $role_id, 'permissions_count' => count($permissions)], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาดในการบันทึก: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
exit;
