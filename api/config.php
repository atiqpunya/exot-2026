<?php
// api/config.php

// Database Credentials
// ATTENTION: Change these values based on your Hosting Provider (cPanel -> MySQL Databases)
// If using XAMPP/Localhost: Host is 'localhost', User is 'root', Pass is '', DB is your DB name.
$host = 'localhost';
$dbname = 'u1234567_exot_db'; // Change this!
$user = 'u1234567_admin'; // Change this!
$pass = 'password_db_anda'; // Change this!

try {
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass);

    // Set PDO error mode to exception
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

}
catch (PDOException $e) {
    // Return JSON error if connection fails
    header('Content-Type: application/json');
    http_response_code(500);
    // Be careful with exposing $e->getMessage() in production, 
    // but for debugging this migration it's essential.
    echo json_encode([
        'error' => 'Database Connection Failed',
        'details' => $e->getMessage(),
        'hint' => 'Check your credentials in api/config.php'
    ]);
    exit();
}
?>
