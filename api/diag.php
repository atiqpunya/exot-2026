<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
echo json_encode([
    "success" => true,
    "message" => "PHP Diagnostic OK",
    "server_info" => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
    "method" => $_SERVER['REQUEST_METHOD'],
    "time" => date('Y-m-d H:i:s')
]);
?>
