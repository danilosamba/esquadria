<?php
// api/index.php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once 'config.php';
require_once 'db_connect.php';
require_once 'jwt_utils.php';

// Robust routing logic
$request_uri = $_SERVER['REQUEST_URI'];
$script_name = $_SERVER['SCRIPT_NAME'];
$base_path = dirname($script_name);

// Remove query string
$path = parse_url($request_uri, PHP_URL_PATH);

// Remove base path from the beginning of the path
if ($base_path !== '/' && strpos($path, $base_path) === 0) {
    $path = substr($path, strlen($base_path));
}

$path = trim($path, '/');
$parts = explode('/', $path);

$resource = $parts[0] ?? '';
$id = $parts[1] ?? null;
$action = $parts[2] ?? null;

// Auth Routes (Public)
if ($resource === 'auth') {
    require_once 'auth_handler.php';
    handle_auth($pdo, $parts);
    exit;
}

// Protected Routes
$headers = getallheaders();

// Fallback for Authorization header if it's not in getallheaders (common on some Apache setups)
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

$token = str_replace('Bearer ', '', $authHeader);
$user = JWT::decode($token);

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Não autorizado']);
    exit;
}

switch ($resource) {
    case 'users':
        require_once 'users_handler.php';
        handle_users($pdo, $user, $id, $action);
        break;
    case 'budgets':
        require_once 'budgets_handler.php';
        handle_budgets($pdo, $user, $id, $action);
        break;
    case 'salespersons':
        require_once 'salespersons_handler.php';
        handle_salespersons($pdo, $user);
        break;
    case 'autocomplete':
        require_once 'autocomplete_handler.php';
        handle_autocomplete($pdo, $id);
        break;
    case 'products':
        require_once 'products_handler.php';
        handle_products($pdo, $user, $id);
        break;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint não encontrado']);
        break;
}
