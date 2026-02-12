<?php
// api/config.php

// Database Credentials
// ====
// ASUMSI: environment pengujian lokal menggunakan MySQL/XAMPP standar
// - Host   : localhost
// - DB Name: exot_2026
// - User   : root
// - Pass   : (kosong)
//
// Untuk server hosting (cPanel, dll), cukup ubah 4 variabel di bawah
// sesuai kredensial database yang Anda buat di hosting.
$host = 'localhost';
$dbname = 'exot_2026';   // Ganti jika nama DB Anda berbeda
$user = 'root';          // Untuk XAMPP/WAMP lokal
$pass = '';              // Password default XAMPP biasanya kosong

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
