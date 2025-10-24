<?php
session_start();
header('Content-Type: application/json');

if (isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => true,
        'logged_in' => true,
        'user' => [
            'id' => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'email' => $_SESSION['email'],
            'fname' => $_SESSION['fname'],
            'lname' => $_SESSION['lname']
        ]
    ]);
} else {
    echo json_encode([
        'success' => true,
        'logged_in' => false
    ]);
}
?>