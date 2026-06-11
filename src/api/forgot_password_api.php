<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../database.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

define('GMAIL_USER', getenv('GMAIL_USER'));
define('GMAIL_PASS', getenv('GMAIL_PASS'));
define('MAIL_NAME', getenv('NOTI_MAIL_NAME') ?: 'SmartMeet Analytics System');
define('APP_NAME',  getenv('APP_NAME') ?: 'SmartMeet Analytics System');
define('APP_URL',   getenv('APP_URL') ?: 'http://localhost:8080');

function generateTempPassword(): string
{
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    $pass  = '';
    for ($i = 0; $i < 10; $i++) {
        $pass .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $pass;
}

$ipKey = 'fp_' . md5($_SERVER['REMOTE_ADDR'] ?? '');
$now = time();

$_SESSION[$ipKey] = array_filter($_SESSION[$ipKey] ?? [], fn($t) => $now - $t < 300);
if (count($_SESSION[$ipKey]) >= 3) {
    echo json_encode(['success' => false, 'message' => 'Too many requests. Please wait 5 minutes.']);
    exit;
}
$_SESSION[$ipKey][] = $now;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$body  = json_decode(file_get_contents('php://input'), true);
$email = trim(strtolower($body['email'] ?? ''));

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Invalid email address']);
    exit;
}

$database = new Database();
$pdo = $database->getConnection();

$stmt = $pdo->prepare("
    SELECT user_id, fname, lname, email
    FROM users
    WHERE email = ?
    LIMIT 1
");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo json_encode(['success' => false, 'message' => 'อีเมลนี้ยังไม่มีบัญชีในระบบ']);
    exit;
}

$tempPass = generateTempPassword();
$hashed = password_hash($tempPass, PASSWORD_BCRYPT, ['cost' => 12]);

$stmt = $pdo->prepare("UPDATE users SET user_password = ? WHERE user_id = ?");
$stmt->execute([$hashed, $user['user_id']]);

$username = htmlspecialchars($user['fname'] . ' ' . $user['lname']);
$year = date('Y');

$emailHtml = "
<h2>สวัสดี {$username}</h2>
<p>รหัสผ่านชั่วคราวของคุณคือ:</p>
<h1>{$tempPass}</h1>
<p>กรุณาใช้รหัสผ่านนี้เพื่อเข้าสู่ระบบและเปลี่ยนรหัสผ่านของคุณทันที</p> ";

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = GMAIL_USER;
    $mail->Password   = GMAIL_PASS;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;
    $mail->CharSet    = 'UTF-8';

    $mail->setFrom(GMAIL_USER, MAIL_NAME);
    $mail->addAddress($email, $username);
    $mail->isHTML(true);
    $mail->Subject = 'รหัสผ่านชั่วคราว - ' . APP_NAME;
    $mail->Body    = $emailHtml;
    $mail->AltBody = "รหัสผ่านชั่วคราว: {$tempPass}";

    $mail->send();
    echo json_encode(['success' => true, 'message' => 'ส่งรหัสผ่านชั่วคราวไปยังอีเมลแล้ว']);
} catch (Exception $e) {
    error_log('[ForgotPassword] ' . $mail->ErrorInfo);
    echo json_encode(['success' => false, 'message' => 'Failed to send email']);
}
