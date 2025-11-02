<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:5500');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/../database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database connection error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ฟังก์ชันอัปโหลดรูปภาพ
function uploadImage($file) {
    $uploadDir = __DIR__ . '/../../uploads/rooms/';
    
    // สร้างโฟลเดอร์ถ้ายังไม่มี
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    // ตรวจสอบไฟล์
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (!in_array($file['type'], $allowedTypes)) {
        return ['success' => false, 'message' => 'รองรับเฉพาะไฟล์ JPG, PNG, GIF เท่านั้น'];
    }
    
    // ตรวจสอบขนาดไฟล์ (ไม่เกิน 2MB)
    if ($file['size'] > 2 * 1024 * 1024) {
        return ['success' => false, 'message' => 'ขนาดไฟล์ต้องไม่เกิน 2MB'];
    }
    
    // สร้างชื่อไฟล์ใหม่
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $newFileName = 'room_' . time() . '_' . uniqid() . '.' . $extension;
    $uploadPath = $uploadDir . $newFileName;
    
    // อัปโหลดไฟล์
    if (move_uploaded_file($file['tmp_name'], $uploadPath)) {
        return [
            'success' => true, 
            'filename' => $newFileName,
            'url' => '/uploads/rooms/' . $newFileName
        ];
    } else {
        return ['success' => false, 'message' => 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์'];
    }
}

// ฟังก์ชันลบรูปภาพ
function deleteImage($imageUrl) {
    if (!$imageUrl) return;
    
    $imagePath = __DIR__ . '/../../' . $imageUrl;
    if (file_exists($imagePath)) {
        unlink($imagePath);
    }
}

// ฟังก์ชันส่งข้อมูลกลับ
function sendResponse($success, $data = null, $message = '') {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
}

// รับข้อมูลจาก request
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// จัดการ GET Request
if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'getAll':
            try {
                $stmt = $pdo->query("SELECT * FROM Meeting_Rooms ORDER BY room_id DESC");
                $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
                sendResponse(true, $rooms, 'ดึงข้อมูลสำเร็จ');
            } catch (PDOException $e) {
                sendResponse(false, null, 'เกิดข้อผิดพลาด: ' . $e->getMessage());
            }
            break;
            
        case 'getById':
            try {
                $id = $_GET['id'] ?? 0;
                $stmt = $pdo->prepare("SELECT * FROM Meeting_Rooms WHERE room_id = :id");
                $stmt->execute([':id' => $id]);
                $room = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($room) {
                    sendResponse(true, $room, 'ดึงข้อมูลสำเร็จ');
                } else {
                    sendResponse(false, null, 'ไม่พบข้อมูล');
                }
            } catch (PDOException $e) {
                sendResponse(false, null, 'เกิดข้อผิดพลาด: ' . $e->getMessage());
            }
            break;
            
        case 'getStatus':
            try {
                $stmt = $pdo->query("SELECT * FROM status ORDER BY status_id ASC");
                $statuses = $stmt->fetchAll(PDO::FETCH_ASSOC);
                sendResponse(true, $statuses, 'ดึงข้อมูลสถานะสำเร็จ');
            } catch (PDOException $e) {
                sendResponse(false, null, 'เกิดข้อผิดพลาด: ' . $e->getMessage());
            }
            break;
            
        default:
            sendResponse(false, null, 'Invalid action for GET request');
            break;
    }
}
// จัดการ POST Request
elseif ($method === 'POST') {
    // รับข้อมูลจาก FormData
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'create':
            try {
                if (!isset($_POST['room_name'], $_POST['capacity'], $_POST['room_size'], 
                          $_POST['floor_number'], $_POST['status'], $_POST['open_time'], 
                          $_POST['close_time'])) {
                    sendResponse(false, null, 'ข้อมูลไม่ครบถ้วน');
                    exit;
                }
                
                // จัดการอัปโหลดรูปภาพ
                $imageUrl = null;
                if (isset($_FILES['image']) && $_FILES['image']['error'] === 0) {
                    $uploadResult = uploadImage($_FILES['image']);
                    if ($uploadResult['success']) {
                        $imageUrl = $uploadResult['url'];
                    } else {
                        sendResponse(false, null, $uploadResult['message']);
                        exit;
                    }
                }
                
                $stmt = $pdo->prepare("
                    INSERT INTO Meeting_Rooms 
                    (room_name, capacity, room_size, floor_number, status, 
                     open_time, close_time, image_url, description, created_at, updated_at) 
                    VALUES (:room_name, :capacity, :room_size, :floor_number, :status, 
                            :open_time, :close_time, :image_url, :description, NOW(), NOW())
                ");
                
                $stmt->execute([
                    ':room_name' => $_POST['room_name'],
                    ':capacity' => $_POST['capacity'],
                    ':room_size' => $_POST['room_size'],
                    ':floor_number' => $_POST['floor_number'],
                    ':status' => $_POST['status'],
                    ':open_time' => $_POST['open_time'],
                    ':close_time' => $_POST['close_time'],
                    ':image_url' => $imageUrl,
                    ':description' => $_POST['description'] ?? null
                ]);
                
                $insertId = $pdo->lastInsertId();
                sendResponse(true, ['room_id' => $insertId], 'เพิ่มข้อมูลสำเร็จ');
                
            } catch (PDOException $e) {
                sendResponse(false, null, 'เกิดข้อผิดพลาด: ' . $e->getMessage());
            }
            break;
            
        case 'update':
            try {
                if (!isset($_POST['room_id'], $_POST['room_name'], $_POST['capacity'], 
                          $_POST['room_size'], $_POST['floor_number'], $_POST['status'], 
                          $_POST['open_time'], $_POST['close_time'])) {
                    sendResponse(false, null, 'ข้อมูลไม่ครบถ้วน');
                    exit;
                }
                
                // ดึงข้อมูลเดิมเพื่อเช็ครูปภาพเดิม
                $oldStmt = $pdo->prepare("SELECT image_url FROM Meeting_Rooms WHERE room_id = :room_id");
                $oldStmt->execute([':room_id' => $_POST['room_id']]);
                $oldRoom = $oldStmt->fetch(PDO::FETCH_ASSOC);
                
                $imageUrl = $oldRoom['image_url'];
                
                // จัดการอัปโหลดรูปภาพใหม่
                if (isset($_FILES['image']) && $_FILES['image']['error'] === 0) {
                    // ลบรูปเดิม
                    if ($oldRoom['image_url']) {
                        deleteImage($oldRoom['image_url']);
                    }
                    
                    $uploadResult = uploadImage($_FILES['image']);
                    if ($uploadResult['success']) {
                        $imageUrl = $uploadResult['url'];
                    } else {
                        sendResponse(false, null, $uploadResult['message']);
                        exit;
                    }
                }
                
                $stmt = $pdo->prepare("
                    UPDATE Meeting_Rooms SET 
                    room_name = :room_name,
                    capacity = :capacity,
                    room_size = :room_size,
                    floor_number = :floor_number,
                    status = :status,
                    open_time = :open_time,
                    close_time = :close_time,
                    image_url = :image_url,
                    description = :description,
                    updated_at = NOW()
                    WHERE room_id = :room_id
                ");
                
                $stmt->execute([
                    ':room_name' => $_POST['room_name'],
                    ':capacity' => $_POST['capacity'],
                    ':room_size' => $_POST['room_size'],
                    ':floor_number' => $_POST['floor_number'],
                    ':status' => $_POST['status'],
                    ':open_time' => $_POST['open_time'],
                    ':close_time' => $_POST['close_time'],
                    ':image_url' => $imageUrl,
                    ':description' => $_POST['description'] ?? null,
                    ':room_id' => $_POST['room_id']
                ]);
                
                if ($stmt->rowCount() > 0) {
                    sendResponse(true, null, 'แก้ไขข้อมูลสำเร็จ');
                } else {
                    sendResponse(false, null, 'ไม่พบข้อมูลที่ต้องการแก้ไข');
                }
                
            } catch (PDOException $e) {
                sendResponse(false, null, 'เกิดข้อผิดพลาด: ' . $e->getMessage());
            }
            break;
            
        case 'delete':
            try {
                // รับข้อมูลจาก JSON สำหรับ delete
                $deleteInput = json_decode(file_get_contents('php://input'), true);
                
                if (!isset($deleteInput['room_id'])) {
                    sendResponse(false, null, 'ไม่พบ room_id');
                    exit;
                }
                
                // ดึงข้อมูลรูปภาพก่อนลบ
                $imageStmt = $pdo->prepare("SELECT image_url FROM Meeting_Rooms WHERE room_id = :room_id");
                $imageStmt->execute([':room_id' => $deleteInput['room_id']]);
                $roomData = $imageStmt->fetch(PDO::FETCH_ASSOC);
                
                // ตรวจสอบว่ามีการจองห้องนี้อยู่หรือไม่
                $checkStmt = $pdo->prepare("
                    SELECT COUNT(*) as count 
                    FROM Bookings 
                    WHERE room_id = :room_id AND status = 1
                ");
                $checkStmt->execute([':room_id' => $deleteInput['room_id']]);
                $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($result['count'] > 0) {
                    sendResponse(false, null, 'ไม่สามารถลบห้องนี้ได้ เนื่องจากมีการจองอยู่');
                    exit;
                }
                
                $stmt = $pdo->prepare("DELETE FROM Meeting_Rooms WHERE room_id = :room_id");
                $stmt->execute([':room_id' => $deleteInput['room_id']]);
                
                if ($stmt->rowCount() > 0) {
                    // ลบรูปภาพ
                    if ($roomData && $roomData['image_url']) {
                        deleteImage($roomData['image_url']);
                    }
                    sendResponse(true, null, 'ลบข้อมูลสำเร็จ');
                } else {
                    sendResponse(false, null, 'ไม่พบข้อมูลที่ต้องการลบ');
                }
                
            } catch (PDOException $e) {
                sendResponse(false, null, 'เกิดข้อผิดพลาด: ' . $e->getMessage());
            }
            break;
            
        default:
            sendResponse(false, null, 'Invalid action for POST request');
            break;
    }
} 
else {
    sendResponse(false, null, 'Method not allowed');
}
?>