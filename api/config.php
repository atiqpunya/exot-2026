<?php
// api/config.php

// Database Credentials
// Change these values based on your Hosting Provider (cPanel -> MySQL Databases)
$host = 'localhost';
$dbname = 'u1234567_exot_db'; // Example database name
$user = 'u1234567_admin';    // Example username
$pass = 'password_db_anda';  // Example password

try {
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass);
    
    // Set PDO error mode to exception
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    // Return JSON error if connection fails
    header('Content-Type: application/json');
    http_response_code(500);
    echo JSON_encode(['error' => 'Database Connection Failed: ' . $e->getMessage()]);
    exit();
}
?>
