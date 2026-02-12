<?php
// api/index.php
// Main API Handler for EXOT 2026

header("Access-Control-Allow-Origin: *"); // Allow all domains (for dev), restrict in prod if needed
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'getAll':
            handleGetAll($pdo);
            break;
            
        case 'save':
            handleSave($pdo);
            break;
            
        case 'uploadFile':
            handleUploadFile($pdo);
            break;
            
        default:
            throw new Exception("Invalid Action: $action");
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}

// ==========================================
// Handlers
// ==========================================

function handleGetAll($pdo) {
    $data = [];
    
    // Fetch Students
    $stmt = $pdo->query("SELECT * FROM students");
    $students = $stmt->fetchAll();
    // Decode JSON columns
    foreach ($students as &$s) {
        $s['scores'] = json_decode($s['scores'], true);
        $s['scored_by'] = json_decode($s['scored_by'], true); // Fix key name mismatch from schema? No, schema is scored_by
        $s['attended'] = (bool)$s['attended'];
    }
    $data['students'] = $students;

    // Fetch Users
    $stmt = $pdo->query("SELECT * FROM users");
    $users = $stmt->fetchAll();
    foreach ($users as &$u) {
        $u['assigned_classes'] = json_decode($u['assigned_classes'], true);
    }
    $data['users'] = $users;
    
    // Fetch Questions
    $stmt = $pdo->query("SELECT * FROM questions");
    $data['questions'] = $stmt->fetchAll();
    
    // Fetch Classes
    $stmt = $pdo->query("SELECT name FROM classes");
    $data['classes'] = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode($data);
}

function handleSave($pdo) {
    // Get JSON Input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
         // Fallback to POST fields if form-data
         $input = $_POST;
    }

    $type = $input['type'] ?? '';
    $data = $input['data'] ?? null;
    
    if (!$data) throw new Exception("No data provided");

    $pdo->beginTransaction();

    try {
        if ($type === 'students') {
            // Bulk Save Students (Replace logic or Update?)
            // For simplicity and matching GAS logic: loop and upsert
            // GAS was overwriting full JSON. Here we should ideally handle granular, 
            // but let's assume we receive the full list or a single item?
            // The existing Frontend sends the WHOLE array for 'students'.
            // Efficient: DELETE ALL and INSERT ALL? No, risky.
            // Better: Upsert (INSERT INTO ... ON DUPLICATE KEY UPDATE)
            
            // To be safe with the current frontend sending FULL ARRAY, 
            // we first check if it IS an array
            if (is_array($data)) {
                foreach ($data as $row) {
                    $jsonScores = json_encode($row['scores'] ?? []);
                    $jsonScoredBy = json_decode(json_encode($row['scored_by'] ?? []), true); // Ensure format
                    // Map frontend keys to DB columns
                     // Frontend: scoredBy -> DB: scored_by
                     $jsonScoredBy = json_encode($row['scoredBy'] ?? []);
                    
                    $sql = "INSERT INTO students (id, name, class, type, qr_code, attended, attended_at, scores, scored_by)
                            VALUES (:id, :name, :class, :type, :qr, :att, :att_at, :scores, :scored_by)
                            ON DUPLICATE KEY UPDATE
                            name=VALUES(name), class=VALUES(class), type=VALUES(type), 
                            attended=VALUES(attended), attended_at=VALUES(attended_at),
                            scores=VALUES(scores), scored_by=VALUES(scored_by)";
                    
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        ':id' => $row['id'],
                        ':name' => $row['name'],
                        ':class' => $row['class'],
                        ':type' => $row['type'] ?? 'siswa',
                        ':qr' => $row['qrCode'] ?? $row['id'],
                        ':att' => !empty($row['attended']) ? 1 : 0,
                        ':att_at' => $row['attendedAt'] ?? null,
                        ':scores' => json_encode($row['scores'] ?? []),
                        ':scored_by' => json_encode($row['scoredBy'] ?? [])
                    ]);
                    
                    // Also track Class
                    if (!empty($row['class'])) {
                        $pdo->query("INSERT IGNORE INTO classes (name) VALUES ('" . $row['class'] . "')");
                    }
                }
            }
        }
        
        elseif ($type === 'users') {
            if (is_array($data)) {
                foreach ($data as $row) {
                    $sql = "INSERT INTO users (id, username, password, name, role, subject, assigned_classes, qr_code)
                            VALUES (:id, :u, :p, :n, :r, :s, :ac, :qr)
                            ON DUPLICATE KEY UPDATE
                            password=VALUES(password), name=VALUES(name), role=VALUES(role),
                            subject=VALUES(subject), assigned_classes=VALUES(assigned_classes)";
                            
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        ':id' => $row['id'],
                        ':u' => $row['username'],
                        ':p' => $row['password'],
                        ':n' => $row['name'],
                        ':r' => $row['role'],
                        ':s' => $row['subject'] ?? null,
                        ':ac' => json_encode($row['assignedClasses'] ?? []),
                        ':qr' => $row['qrCode'] ?? null
                    ]);
                }
            }
        }
        
        elseif ($type === 'questions') {
             if (is_array($data)) {
                 // First, maybe clear existing? Or just upsert.
                 // Let's upsert.
                 foreach ($data as $row) {
                    $sql = "INSERT INTO questions (id, room, subject, content, type, target_student, storage_path)
                            VALUES (:id, :room, :subj, :cont, :type, :tgt, :path)
                            ON DUPLICATE KEY UPDATE
                            room=VALUES(room), subject=VALUES(subject), content=VALUES(content), storage_path=VALUES(storage_path)";
                            
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        ':id' => $row['id'],
                        ':room' => $row['room'],
                        ':subj' => $row['subject'],
                        ':cont' => $row['content'],
                        ':type' => $row['type'],
                        ':tgt' => $row['targetStudent'] ?? null,
                        ':path' => $row['storagePath'] ?? null
                    ]);
                 }
             }
        }
        
        elseif ($type === 'exot_connection_test') {
            // Do nothing, just verify connection which is implicit
        }

        $pdo->commit();
        echo json_encode(['success' => true]);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handleUploadFile($pdo) {
    if (!isset($_FILES['file'])) {
        throw new Exception("No file uploaded");
    }

    $file = $_FILES['file'];
    $subject = $_POST['subject'] ?? 'unknown';
    
    // Directory: uploads/english/
    $uploadDir = __DIR__ . '/uploads/' . $subject . '/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = time() . '_' . preg_replace('/[^a-zA-Z0-9]/', '_', pathinfo($file['name'], PATHINFO_FILENAME)) . '.' . $ext;
    $targetPath = $uploadDir . $filename;
    
    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        // Return public URL
        // Assuming API is at domain.com/api/, file is at domain.com/api/uploads/...
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
        $domain = $_SERVER['HTTP_HOST'];
        $path = dirname($_SERVER['PHP_SELF']); // /api
        
        $publicUrl = "$protocol://$domain$path/uploads/$subject/$filename";
        
        echo json_encode([
            'success' => true,
            'url' => $publicUrl,
            'originalName' => $file['name']
        ]);
    } else {
        throw new Exception("Failed to move uploaded file");
    }
}
?>
