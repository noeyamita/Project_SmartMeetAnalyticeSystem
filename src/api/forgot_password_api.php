<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => 'Database connection failed']));
}

$conn->set_charset("utf8");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';

    // ตรวจสอบว่ามีอีเมลนี้ในระบบหรือไม่
    $stmt = $conn->prepare("SELECT id, username FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Email not found in system']);
        exit;
    }

    $user = $result->fetch_assoc();
    
    // สร้างรหัสชั่วคราว (6 หลัก)
    $tempPassword = sprintf("%06d", mt_rand(100000, 999999));
    
    // เข้ารหัสรหัสผ่านชั่วคราว
    $hashedTempPassword = password_hash($tempPassword, PASSWORD_BCRYPT);
    
    // อัพเดทรหัสผ่านเป็นรหัสชั่วคราวเลย (ไม่มีการหมดอายุ)
    $stmt = $conn->prepare("UPDATE users SET password = ? WHERE email = ?");
    $stmt->bind_param("ss", $hashedTempPassword, $email);
    
    if ($stmt->execute()) {
        // ส่งอีเมล
        $to = $email;
        $subject = "รหัสผ่านชั่วคราวสำหรับเข้าสู่ระบบ";
        $message = "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .code-box { background: #f0f0f0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; border-radius: 8px; margin: 20px 0; }
                .warning { color: #d9534f; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <h2>รหัสผ่านชั่วคราวของคุณ</h2>
                <p>สวัสดี,</p>
                <p>คุณได้ขอรหัสผ่านชั่วคราวสำหรับเข้าสู่ระบบ กรุณาใช้รหัสด้านล่างเพื่อเข้าสู่ระบบ:</p>
                
                <div class='code-box'>
                    {$tempPassword}
                </div>
                
                <p class='warning'>⚠️ นี่คือรหัสผ่านชั่วคราวของคุณ</p>
                <p>คุณสามารถใช้รหัสนี้เข้าสู่ระบบได้ทันที และสามารถเปลี่ยนรหัสผ่านใหม่ได้ภายหลัง</p>
                
                <p>หากคุณไม่ได้ขอรหัสนี้ กรุณาเพิกเฉยต่ออีเมลนี้</p>
            </div>
        </body>
        </html>
        ";
        
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= "From: noreply@yourwebsite.com" . "\r\n";
        
        // ใช้ mail() function ของ PHP (ต้องตั้งค่า mail server ก่อน)
        if (mail($to, $subject, $message, $headers)) {
            echo json_encode([
                'success' => true, 
                'message' => 'Temporary password has been sent to your email',
                'debug_code' => $tempPassword // ลบออกใน production
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to send email']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to generate temporary password']);
    }
    
    $stmt->close();
}

$conn->close();
?>