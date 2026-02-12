<?php
// api/test_db.php
// Diagnostic script for EXOT 2026

header('Content-Type: application/json');

try {
    require_once 'config.php';

    $status = [
        'connection' => 'SUCCESS',
        'tables' => []
    ];

    // Check tables
    $tables = ['students', 'users', 'questions', 'classes', 'settings'];
    foreach ($tables as $table) {
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM $table");
            $count = $stmt->fetchColumn();
            $status['tables'][$table] = [
                'exists' => true,
                'count' => $count
            ];
        }
        catch (Exception $e) {
            $status['tables'][$table] = [
                'exists' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    // Check character set
    $stmt = $pdo->query("SELECT @@character_set_database, @@collation_database");
    $status['database_info'] = $stmt->fetch();

    echo json_encode($status, JSON_PRETTY_PRINT);

}
catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'connection' => 'FAILED',
        'error' => $e->getMessage(),
        'hint' => 'Check your database credentials in api/config.php'
    ], JSON_PRETTY_PRINT);
}
