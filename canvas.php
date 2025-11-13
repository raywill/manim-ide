<?php
declare(strict_types=1);

session_start();

// ────────────────────────────────────────────────
// CORS & 基础设置
// ────────────────────────────────────────────────

$allowedOrigin = getAllowedOrigin();
if ($allowedOrigin !== null) {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$action = $_GET['action'] ?? '';

try {
    $db = getDatabase();
    switch ($action) {
        case 'auth_session':
            handleAuthSession($db);
            break;
        case 'auth_register_options':
            handleAuthRegisterOptions();
            break;
        case 'auth_register_verify':
            handleAuthRegisterVerify($db);
            break;
        case 'auth_login_options':
            handleAuthLoginOptions($db);
            break;
        case 'auth_login_verify':
            handleAuthLoginVerify($db);
            break;
        case 'auth_logout':
            handleAuthLogout();
            break;
        case 'canvas_get':
            handleCanvasGet($db);
            break;
        case 'canvas_save':
            handleCanvasSave($db);
            break;
        case 'canvas_share':
            handleCanvasShare($db);
            break;
        case 'canvas_unshare':
            handleCanvasUnshare($db);
            break;
        case 'share_view':
            handleShareView($db);
            break;
        default:
            jsonResponse(['error' => 'Unknown action'], 400);
    }
} catch (Throwable $e) {
    jsonResponse([
        'error' => 'Server error',
        'details' => $e->getMessage()
    ], 500);
}

// ────────────────────────────────────────────────
// 处理函数
// ────────────────────────────────────────────────

function handleAuthSession(PDO $db): void
{
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(['loggedIn' => false]);
        return;
    }

    $stmt = $db->prepare('SELECT id, username, display_name FROM users WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        session_destroy();
        jsonResponse(['loggedIn' => false]);
        return;
    }

    jsonResponse([
        'loggedIn' => true,
        'userId' => (int)$user['id'],
        'username' => $user['username'],
        'displayName' => $user['display_name']
    ]);
}

function handleAuthRegisterOptions(): void
{
    $input = readJsonBody();
    $displayName = trim((string)($input['displayName'] ?? ($_GET['displayName'] ?? '')));
    if ($displayName === '') {
        $displayName = 'Manim 用户';
    }

    $challenge = random_bytes(32);
    $userHandle = random_bytes(16);
    $username = 'user_' . bin2hex(random_bytes(4));

    $_SESSION['register_challenge'] = base64url_encode($challenge);
    $_SESSION['register_user_handle'] = base64url_encode($userHandle);
    $_SESSION['register_display_name'] = $displayName;
    $_SESSION['register_username'] = $username;

    $options = [
        'challenge' => $_SESSION['register_challenge'],
        'rp' => [
            'name' => 'Manim IDE',
            'id' => determineRpId(),
        ],
        'user' => [
            'id' => base64url_encode($userHandle),
            'name' => $username,
            'displayName' => $displayName,
        ],
        'pubKeyCredParams' => [
            ['type' => 'public-key', 'alg' => -7],   // ES256
            ['type' => 'public-key', 'alg' => -257], // RS256
        ],
        'timeout' => 60000,
        'attestation' => 'none',
        'authenticatorSelection' => [
            'residentKey' => 'preferred',
            'userVerification' => 'preferred',
        ],
    ];

    jsonResponse($options);
}

function handleAuthRegisterVerify(PDO $db): void
{
    $input = readJsonBody();

    if (!isset($_SESSION['register_challenge'], $_SESSION['register_user_handle'])) {
        jsonResponse(['error' => 'Registration session expired'], 400);
        return;
    }

    $clientDataJSON = $input['response']['clientDataJSON'] ?? '';
    if (!is_string($clientDataJSON) || $clientDataJSON === '') {
        jsonResponse(['error' => 'Missing client data'], 400);
        return;
    }

    $clientData = json_decode(base64url_decode($clientDataJSON) ?: 'null', true);
    if (!is_array($clientData) || !isset($clientData['challenge'])) {
        jsonResponse(['error' => 'Invalid client data'], 400);
        return;
    }

    if (!hash_equals($_SESSION['register_challenge'], normalizeChallenge($clientData['challenge']))) {
        jsonResponse(['error' => 'Challenge mismatch'], 400);
        return;
    }

    $credentialId = (string)($input['id'] ?? '');
    if ($credentialId === '') {
        jsonResponse(['error' => 'Missing credential id'], 400);
        return;
    }

    $rawId = (string)($input['rawId'] ?? '');
    $attestation = $input['response']['attestationObject'] ?? null;

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('INSERT INTO users (username, display_name) VALUES (:username, :display_name)');
        $stmt->execute([
            ':username' => $_SESSION['register_username'] ?? $credentialId,
            ':display_name' => $_SESSION['register_display_name'] ?? 'Manim 用户',
        ]);
        $userId = (int)$db->lastInsertId();

        $stmt = $db->prepare('INSERT INTO webauthn_credentials (user_id, credential_id, raw_id, public_key, sign_count) VALUES (:user_id, :credential_id, :raw_id, :public_key, :sign_count)');
        $stmt->execute([
            ':user_id' => $userId,
            ':credential_id' => $credentialId,
            ':raw_id' => $rawId,
            ':public_key' => $attestation ?? '',
            ':sign_count' => 0,
        ]);

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        jsonResponse(['error' => 'Failed to store credential', 'details' => $e->getMessage()], 500);
        return;
    }

    unset($_SESSION['register_challenge'], $_SESSION['register_user_handle'], $_SESSION['register_display_name'], $_SESSION['register_username']);

    $_SESSION['user_id'] = $userId;

    jsonResponse(['loggedIn' => true, 'userId' => $userId]);
}

function handleAuthLoginOptions(PDO $db): void
{
    $challenge = random_bytes(32);
    $_SESSION['login_challenge'] = base64url_encode($challenge);

    $stmt = $db->query('SELECT credential_id FROM webauthn_credentials');
    $credentials = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $credentials[] = [
            'type' => 'public-key',
            'id' => $row['credential_id'],
        ];
    }

    $options = [
        'challenge' => $_SESSION['login_challenge'],
        'timeout' => 60000,
        'rpId' => determineRpId(),
        'userVerification' => 'preferred',
        'allowCredentials' => $credentials,
    ];

    jsonResponse($options);
}

function handleAuthLoginVerify(PDO $db): void
{
    $input = readJsonBody();

    if (!isset($_SESSION['login_challenge'])) {
        jsonResponse(['error' => 'Login session expired'], 400);
        return;
    }

    $clientDataJSON = $input['response']['clientDataJSON'] ?? '';
    if (!is_string($clientDataJSON) || $clientDataJSON === '') {
        jsonResponse(['error' => 'Missing client data'], 400);
        return;
    }

    $clientData = json_decode(base64url_decode($clientDataJSON) ?: 'null', true);
    if (!is_array($clientData) || !isset($clientData['challenge'])) {
        jsonResponse(['error' => 'Invalid client data'], 400);
        return;
    }

    if (!hash_equals($_SESSION['login_challenge'], normalizeChallenge($clientData['challenge']))) {
        jsonResponse(['error' => 'Challenge mismatch'], 400);
        return;
    }

    $credentialId = (string)($input['id'] ?? '');
    if ($credentialId === '') {
        jsonResponse(['error' => 'Missing credential id'], 400);
        return;
    }

    $stmt = $db->prepare('SELECT user_id FROM webauthn_credentials WHERE credential_id = :credential_id LIMIT 1');
    $stmt->execute([':credential_id' => $credentialId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        jsonResponse(['error' => 'Credential not found'], 404);
        return;
    }

    $_SESSION['user_id'] = (int)$row['user_id'];
    unset($_SESSION['login_challenge']);

    jsonResponse(['loggedIn' => true, 'userId' => (int)$row['user_id']]);
}

function handleAuthLogout(): void
{
    session_destroy();
    jsonResponse(['success' => true]);
}

function handleCanvasGet(PDO $db): void
{
    $userId = requireLogin();

    $stmt = $db->prepare('SELECT content_json, updated_at, is_shared, share_token FROM canvases WHERE owner_id = :owner LIMIT 1');
    $stmt->execute([':owner' => $userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        jsonResponse([
            'contentJson' => null,
            'updatedAt' => null,
            'isShared' => false,
            'shareUrl' => null,
        ]);
        return;
    }

    jsonResponse([
        'contentJson' => $row['content_json'],
        'updatedAt' => $row['updated_at'],
        'isShared' => (bool)$row['is_shared'],
        'shareUrl' => $row['is_shared'] ? buildSharePageUrl((string)$row['share_token']) : null,
    ]);
}

function handleCanvasSave(PDO $db): void
{
    $userId = requireLogin();
    $input = readJsonBody();
    $contentJson = $input['contentJson'] ?? null;

    if (!is_string($contentJson)) {
        jsonResponse(['error' => 'Invalid payload'], 400);
        return;
    }

    $timestamp = currentIsoTimestamp();

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT id FROM canvases WHERE owner_id = :owner LIMIT 1');
        $stmt->execute([':owner' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $stmt = $db->prepare('UPDATE canvases SET content_json = :content, updated_at = :updated WHERE owner_id = :owner');
            $stmt->execute([
                ':content' => $contentJson,
                ':updated' => $timestamp,
                ':owner' => $userId,
            ]);
        } else {
            $stmt = $db->prepare('INSERT INTO canvases (owner_id, content_json, is_shared, share_token, updated_at) VALUES (:owner, :content, 0, NULL, :updated)');
            $stmt->execute([
                ':owner' => $userId,
                ':content' => $contentJson,
                ':updated' => $timestamp,
            ]);
        }

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        jsonResponse(['error' => 'Failed to save canvas', 'details' => $e->getMessage()], 500);
        return;
    }

    jsonResponse([
        'success' => true,
        'updatedAt' => $timestamp,
        'isShared' => isCanvasShared($db, $userId),
        'shareUrl' => getShareUrlIfShared($db, $userId),
    ]);
}

function handleCanvasShare(PDO $db): void
{
    $userId = requireLogin();
    $input = readJsonBody();
    $contentJson = $input['contentJson'] ?? null;

    if (!is_string($contentJson)) {
        jsonResponse(['error' => 'Invalid payload'], 400);
        return;
    }

    $timestamp = currentIsoTimestamp();
    $shareToken = generateShareToken();

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT share_token FROM canvases WHERE owner_id = :owner LIMIT 1');
        $stmt->execute([':owner' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $tokenToUse = $row['share_token'] ?: $shareToken;
            $stmt = $db->prepare('UPDATE canvases SET content_json = :content, updated_at = :updated, is_shared = 1, share_token = :token WHERE owner_id = :owner');
            $stmt->execute([
                ':content' => $contentJson,
                ':updated' => $timestamp,
                ':token' => $tokenToUse,
                ':owner' => $userId,
            ]);
            $shareToken = $tokenToUse;
        } else {
            $stmt = $db->prepare('INSERT INTO canvases (owner_id, content_json, is_shared, share_token, updated_at) VALUES (:owner, :content, 1, :token, :updated)');
            $stmt->execute([
                ':owner' => $userId,
                ':content' => $contentJson,
                ':token' => $shareToken,
                ':updated' => $timestamp,
            ]);
        }

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        jsonResponse(['error' => 'Failed to share canvas', 'details' => $e->getMessage()], 500);
        return;
    }

    jsonResponse([
        'success' => true,
        'updatedAt' => $timestamp,
        'shareUrl' => buildSharePageUrl($shareToken),
    ]);
}

function handleCanvasUnshare(PDO $db): void
{
    $userId = requireLogin();

    $stmt = $db->prepare('UPDATE canvases SET is_shared = 0 WHERE owner_id = :owner');
    $stmt->execute([':owner' => $userId]);

    jsonResponse([
        'success' => true,
        'isShared' => false,
    ]);
}

function handleShareView(PDO $db): void
{
    $token = $_GET['token'] ?? '';
    if (!is_string($token) || $token === '') {
        jsonResponse(['error' => 'Missing token'], 400);
        return;
    }

    $stmt = $db->prepare('SELECT content_json, updated_at, owner_id, is_shared FROM canvases WHERE share_token = :token LIMIT 1');
    $stmt->execute([':token' => $token]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row || !(bool)$row['is_shared']) {
        jsonResponse(['error' => 'Canvas not available'], 404);
        return;
    }

    jsonResponse([
        'contentJson' => $row['content_json'],
        'updatedAt' => $row['updated_at'],
        'ownerId' => (int)$row['owner_id'],
    ]);
}

// ────────────────────────────────────────────────
// 工具函数
// ────────────────────────────────────────────────

function getAllowedOrigin(): ?string
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return null;
    }

    if (preg_match('#^https?://localhost(:\d+)?$#i', $origin)) {
        return $origin;
    }

    if (stripos($origin, 'https://raywill.github.io') === 0) {
        return $origin;
    }

    return null;
}

function determineRpId(): string
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        $host = parse_url($origin, PHP_URL_HOST);
        if (is_string($host) && $host !== '') {
            return normalizeHost($host);
        }
    }
    $hostHeader = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return normalizeHost($hostHeader);
}

function getDatabase(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dataDir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0700, true);
    }

    $dbPath = $dataDir . DIRECTORY_SEPARATOR . 'manim_ide.db';
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA journal_mode = WAL');
    $pdo->exec('PRAGMA busy_timeout = 5000');

    $pdo->exec('CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        display_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )');

    $pdo->exec('CREATE TABLE IF NOT EXISTS webauthn_credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        credential_id TEXT UNIQUE NOT NULL,
        raw_id TEXT,
        public_key TEXT,
        sign_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )');

    $pdo->exec('CREATE TABLE IF NOT EXISTS canvases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER UNIQUE NOT NULL,
        content_json TEXT,
        is_shared INTEGER DEFAULT 0,
        share_token TEXT,
        updated_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
    )');

    return $pdo;
}

function jsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readJsonBody(): array
{
    $content = file_get_contents('php://input');
    if ($content === false || $content === '') {
        return [];
    }

    $decoded = json_decode($content, true);
    return is_array($decoded) ? $decoded : [];
}

function base64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string
{
    $remainder = strlen($data) % 4;
    if ($remainder > 0) {
        $padLen = 4 - $remainder;
        $data .= str_repeat('=', $padLen);
    }
    return base64_decode(strtr($data, '-_', '+/')) ?: '';
}

function normalizeChallenge(string $challenge): string
{
    // WebAuthn 在 clientDataJSON 中可能再次 base64url 编码
    if (preg_match('#^[A-Za-z0-9\-_]+$#', $challenge)) {
        return $challenge;
    }
    return base64url_encode($challenge);
}

function requireLogin(): int
{
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }
    return (int)$_SESSION['user_id'];
}

function currentIsoTimestamp(): string
{
    $dt = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    return $dt->format(DateTimeInterface::ATOM);
}

function generateShareToken(): string
{
    return base64url_encode(random_bytes(24));
}

function buildSharePageUrl(string $token): string
{
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $path = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/\\');
    $parts = [];
    if ($path !== '' && $path !== '.') {
        $parts[] = trim($path, '/');
    }
    $parts[] = 'index.html';
    $basePath = implode('/', array_filter($parts));
    if ($basePath !== '') {
        $basePath = '/' . $basePath;
    } else {
        $basePath = '/index.html';
    }
    return $scheme . '://' . $host . $basePath . '?share_token=' . rawurlencode($token);
}

function isCanvasShared(PDO $db, int $userId): bool
{
    $stmt = $db->prepare('SELECT is_shared FROM canvases WHERE owner_id = :owner LIMIT 1');
    $stmt->execute([':owner' => $userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ? (bool)$row['is_shared'] : false;
}

function getShareUrlIfShared(PDO $db, int $userId): ?string
{
    $stmt = $db->prepare('SELECT is_shared, share_token FROM canvases WHERE owner_id = :owner LIMIT 1');
    $stmt->execute([':owner' => $userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row && (bool)$row['is_shared'] && !empty($row['share_token'])) {
        return buildSharePageUrl((string)$row['share_token']);
    }
    return null;
}

function normalizeHost(string $host): string
{
    if (strpos($host, ':') !== false) {
        $host = explode(':', $host, 2)[0];
    }
    return $host !== '' ? $host : 'localhost';
}


