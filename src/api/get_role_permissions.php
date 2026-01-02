<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// การเชื่อมต่อฐานข้อมูล
$host = 'localhost';
$dbname = 'meeting_room_booking';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    echo json_encode([
        'success' => false, 
        'message' => 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// GET - ดึงข้อมูล roles และ permissions
if ($method === 'GET') {
    if (isset($_GET['action']) && $_GET['action'] === 'get_roles') {
        try {
            // ดึงรายการ roles ทั้งหมด
            $stmt = $pdo->query("SELECT role_id, role_name, description FROM roles ORDER BY role_id");
            $roles = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true, 
                'data' => $roles
            ], JSON_UNESCAPED_UNICODE);
        } catch(Exception $e) {
            echo json_encode([
                'success' => false, 
                'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
        }
    } 
    else if (isset($_GET['action']) && $_GET['action'] === 'get_permissions') {
        try {
            // ดึงรายการ permissions ทั้งหมด
            $stmt = $pdo->query("SELECT permission_id, permission_name, permission_key, icon FROM permissions ORDER BY menu_order, permission_id");
            $permissions = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true, 
                'data' => $permissions
            ], JSON_UNESCAPED_UNICODE);
        } catch(Exception $e) {
            echo json_encode([
                'success' => false, 
                'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
        }
    }
    else if (isset($_GET['action']) && $_GET['action'] === 'get_role_permissions' && isset($_GET['role_id'])) {
        try {
            // ดึง permissions ของ role ที่เลือก
            $role_id = intval($_GET['role_id']);
            $stmt = $pdo->prepare("SELECT permission_id FROM role_permissions WHERE role_id = ?");
            $stmt->execute([$role_id]);
            $permissions = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            // แปลงเป็น array ของ integers
            $permissions = array_map('intval', $permissions);
            
            echo json_encode([
                'success' => true, 
                'data' => $permissions
            ], JSON_UNESCAPED_UNICODE);
        } catch(Exception $e) {
            echo json_encode([
                'success' => false, 
                'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
        }
    }
    else {
        echo json_encode([
            'success' => false, 
            'message' => 'Invalid action'
        ], JSON_UNESCAPED_UNICODE);
    }
}

// POST - บันทึก permissions ของ role
else if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (isset($data['role_id']) && isset($data['permissions'])) {
        $role_id = intval($data['role_id']);
        $permissions = $data['permissions'];
        
        try {
            $pdo->beginTransaction();
            
            // ลบ permissions เดิมของ role นี้
            $stmt = $pdo->prepare("DELETE FROM role_permissions WHERE role_id = ?");
            $stmt->execute([$role_id]);
            
            // เพิ่ม permissions ใหม่
            if (!empty($permissions) && is_array($permissions)) {
                $stmt = $pdo->prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
                foreach ($permissions as $permission_id) {
                    $stmt->execute([$role_id, intval($permission_id)]);
                }
            }
            
            $pdo->commit();
            echo json_encode([
                'success' => true, 
                'message' => 'บันทึกสิทธิ์สำเร็จ'
            ], JSON_UNESCAPED_UNICODE);
        } catch(Exception $e) {
            $pdo->rollBack();
            echo json_encode([
                'success' => false, 
                'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
        }
    } else {
        echo json_encode([
            'success' => false, 
            'message' => 'ข้อมูลไม่ครบถ้วน'
        ], JSON_UNESCAPED_UNICODE);
    }
}
else {
    echo json_encode([
        'success' => false, 
        'message' => 'Method not allowed'
    ], JSON_UNESCAPED_UNICODE);
}
?>