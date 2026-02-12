<?php
// api/index.php
// Main API Handler for EXOT 2026

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE, PUT");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

require_once 'config.php';

// Read input stream once
$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true);

// Action can come from GET, POST, or JSON body
$action = $_GET['action'] ?? $_POST['action'] ?? ($jsonInput['action'] ?? '');

try {
    switch ($action) {
        case 'getAll':
            handleGetAll($pdo);
            break;

        case 'save':
            handleSave($pdo, $jsonInput);
            break;

        case 'uploadFile':
            handleUploadFile($pdo);
            break;

        case 'test':
            echo json_encode(['success' => true, 'message' => 'API is online']);
            break;

        default:
            throw new Exception("Invalid or missing action: " . ($action ?: 'empty'));
    }
}
catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

// ==========================================
// Handlers
// ==========================================

function handleGetAll($pdo)
{
    $data = [];

    // Fetch Students
    $stmt = $pdo->query("SELECT * FROM students");
    $students = $stmt->fetchAll();
    // Decode JSON columns and map to camelCase
    foreach ($students as &$s) {
        $s['scores'] = json_decode($s['scores'] ?? '{"english":null,"arabic":null,"alquran":null}', true);
        $s['scoredBy'] = json_decode($s['scored_by'] ?? '{"english":null,"arabic":null,"alquran":null}', true);
        $s['qrCode'] = $s['qr_code'];
        $s['attendedAt'] = $s['attended_at'];
        $s['attended'] = (bool)$s['attended'];

        // Remove snake_case versions
        unset($s['qr_code'], $s['attended_at'], $s['scored_by']);
    }
    $data['students'] = $students;

    // Fetch Users
    $stmt = $pdo->query("SELECT * FROM users");
    $users = $stmt->fetchAll();
    foreach ($users as &$u) {
        $u['assignedClasses'] = json_decode($u['assigned_classes'] ?? '[]', true);
        $u['qrCode'] = $u['qr_code'];
        unset($u['assigned_classes'], $u['qr_code']);
    }
    $data['users'] = $users;

    // Fetch Questions
    $stmt = $pdo->query("SELECT * FROM questions");
    $questions = $stmt->fetchAll();
    foreach ($questions as &$q) {
        $q['targetStudent'] = $q['target_student'];
        $q['storagePath'] = $q['storage_path'];
        unset($q['target_student'], $q['storage_path']);
    }
    $data['questions'] = $questions;

    // Fetch Classes
    $stmt = $pdo->query("SELECT name FROM classes");
    $data['classes'] = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // Fetch Activity Log
    $stmt = $pdo->query("SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 100");
    $activityLog = $stmt->fetchAll();
    foreach ($activityLog as &$log) {
        $log['userId'] = $log['user_id'];
        $log['userName'] = $log['user_name'];
        unset($log['user_id'], $log['user_name']);
    }
    $data['activity_log'] = $activityLog;

    // Fetch Examiner Rewards
    $stmt = $pdo->query("SELECT * FROM examiner_rewards");
    $rewards = $stmt->fetchAll();
    foreach ($rewards as &$r) {
        $r['claimed'] = (bool)$r['claimed'];
        $r['examinerId'] = $r['examiner_id'];
        $r['examinerName'] = $r['examiner_name'];
        $r['qrCode'] = $r['qr_code'];
        $r['generatedAt'] = $r['generated_at'];
        $r['claimedAt'] = $r['claimed_at'];
        unset($r['examiner_id'], $r['examiner_name'], $r['qr_code'], $r['generated_at'], $r['claimed_at']);
    }
    $data['examiner_rewards'] = $rewards;

    // Fetch Settings
    $stmt = $pdo->query("SELECT * FROM settings");
    $settings = $stmt->fetchAll();
    $mappedSettings = [];
    foreach ($settings as $s) {
        $val = $s['value'];
        // Try to decode if looks like JSON
        if (!empty($val) && ($val[0] === '{' || $val[0] === '[') && ($decoded = json_decode($val, true)) !== null) {
            $val = $decoded;
        }
        $mappedSettings[$s['key_name']] = $val;
    }
    $data['settings'] = $mappedSettings;

    echo json_encode($data);
}

function handleSave($pdo, $input = null)
{
    if (!$input) {
        $input = $_POST;
    }

    $type = $input['type'] ?? '';
    $data = $input['data'] ?? null;

    if (!$data)
        throw new Exception("No data provided");

    $pdo->beginTransaction();

    try {
        if ($type === 'students') {
            if (is_array($data)) {
                // To support synchronization of manual deletions from local:
                // Delete students from DB that are NOT in the incoming array
                $incomingIds = array_column($data, 'id');
                if (!empty($incomingIds)) {
                    $placeholders = str_repeat('?,', count($incomingIds) - 1) . '?';
                    $pdo->prepare("DELETE FROM students WHERE id NOT IN ($placeholders)")->execute($incomingIds);
                }
                else {
                    $pdo->query("DELETE FROM students");
                }

                foreach ($data as $row) {
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

                    if (!empty($row['class'])) {
                        $pdo->query("INSERT IGNORE INTO classes (name) VALUES ('" . $row['class'] . "')");
                    }
                }
            }
        }

        elseif ($type === 'users') {
            if (is_array($data)) {
                $incomingIds = array_column($data, 'id');
                if (!empty($incomingIds)) {
                    $placeholders = str_repeat('?,', count($incomingIds) - 1) . '?';
                    $pdo->prepare("DELETE FROM users WHERE id NOT IN ($placeholders)")->execute($incomingIds);
                }
                else {
                    $pdo->query("DELETE FROM users");
                }

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
                $incomingIds = array_column($data, 'id');
                if (!empty($incomingIds)) {
                    $placeholders = str_repeat('?,', count($incomingIds) - 1) . '?';
                    $pdo->prepare("DELETE FROM questions WHERE id NOT IN ($placeholders)")->execute($incomingIds);
                }
                else {
                    $pdo->query("DELETE FROM questions");
                }

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

        elseif ($type === 'activity_log') {
            if (is_array($data)) {
                foreach ($data as $row) {
                    $sql = "INSERT INTO activity_log (id, action, user_id, user_name, details, timestamp)
                            VALUES (:id, :act, :uid, :uname, :det, :ts)
                            ON DUPLICATE KEY UPDATE action=VALUES(action), details=VALUES(details)";

                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        ':id' => $row['id'],
                        ':act' => $row['action'],
                        ':uid' => $row['userId'] ?? 'system',
                        ':uname' => $row['userName'] ?? 'System',
                        ':det' => $row['details'] ?? '',
                        ':ts' => date('Y-m-d H:i:s', strtotime($row['timestamp']))
                    ]);
                }
            }
        }

        elseif ($type === 'examiner_rewards') {
            if (is_array($data)) {
                foreach ($data as $row) {
                    $sql = "INSERT INTO examiner_rewards (id, examiner_id, examiner_name, subject, qr_code, generated_at, claimed, claimed_at)
                            VALUES (:id, :eid, :ename, :subj, :qr, :gen, :cld, :cld_at)
                            ON DUPLICATE KEY UPDATE claimed=VALUES(claimed), claimed_at=VALUES(claimed_at)";

                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        ':id' => $row['id'],
                        ':eid' => $row['examinerId'],
                        ':ename' => $row['examinerName'],
                        ':subj' => $row['subject'] ?? null,
                        ':qr' => $row['qrCode'],
                        ':gen' => date('Y-m-d H:i:s', strtotime($row['generatedAt'])),
                        ':cld' => !empty($row['claimed']) ? 1 : 0,
                        ':cld_at' => !empty($row['claimedAt']) ? date('Y-m-d H:i:s', strtotime($row['claimedAt'])) : null
                    ]);
                }
            }
        }

        elseif ($type === 'settings') {
            // Settings is a special case, it's a KV store
            foreach ($data as $key => $val) {
                $sql = "INSERT INTO settings (key_name, value) VALUES (:k, :v)
                         ON DUPLICATE KEY UPDATE value=VALUES(value)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':k' => $key,
                    ':v' => is_array($val) ? json_encode($val) : $val
                ]);
            }
        }

        elseif ($type === 'exot_connection_test') {
        // Do nothing, just verify connection which is implicit
        }

        $pdo->commit();
        echo json_encode(['success' => true]);

    }
    catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handleUploadFile($pdo)
{
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
    }
    else {
        throw new Exception("Failed to move uploaded file");
    }
}
?>
