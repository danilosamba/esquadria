<?php
// api/auth_handler.php

function handle_auth($pdo, $parts) {
    $action = $parts[1] ?? '';
    $input = json_decode(file_get_contents('php://input'), true);

    if ($action === 'login') {
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';

        if (empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(['error' => 'Nome de usuário e senha são obrigatórios']);
            return;
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE name = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Credenciais inválidas']);
            return;
        }

        if (!$user['is_active']) {
            http_response_code(401);
            echo json_encode(['error' => 'Conta desativada. Entre em contato com um administrador.']);
            return;
        }

        $tokenPayload = [
            'id' => $user['id'],
            'is_admin' => (bool)$user['is_admin'],
            'is_active' => (bool)$user['is_active'],
            'force_reset' => (bool)$user['force_reset'],
            'exp' => time() + (24 * 60 * 60)
        ];

        $token = JWT::encode($tokenPayload);

        log_access($pdo, $user['id'], 'LOGIN', 'Usuário logou no sistema');

        echo json_encode([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'is_admin' => (bool)$user['is_admin'],
                'is_active' => (bool)$user['is_active'],
                'force_reset' => (bool)$user['force_reset']
            ]
        ]);

    } elseif ($action === 'reset-password') {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        $token = str_replace('Bearer ', '', $authHeader);
        $decoded = JWT::decode($token);

        if (!$decoded) {
            http_response_code(401);
            echo json_encode(['error' => 'Não autorizado']);
            return;
        }

        $newPassword = $input['newPassword'] ?? '';
        if (strlen($newPassword) < 6) {
            http_response_code(400);
            echo json_encode(['error' => 'A nova senha deve ter no mínimo 6 caracteres.']);
            return;
        }

        $hash = password_hash($newPassword, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("UPDATE users SET password = ?, force_reset = 0 WHERE id = ?");
        $stmt->execute([$hash, $decoded['id']]);

        $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$decoded['id']]);
        $updatedUser = $stmt->fetch();

        $newTokenPayload = [
            'id' => $updatedUser['id'],
            'is_admin' => (bool)$updatedUser['is_admin'],
            'is_active' => (bool)$updatedUser['is_active'],
            'force_reset' => (bool)$updatedUser['force_reset'],
            'exp' => time() + (24 * 60 * 60)
        ];

        $newToken = JWT::encode($newTokenPayload);

        log_access($pdo, $updatedUser['id'], 'RESET_PASSWORD', 'Usuário redefiniu a própria senha');

        echo json_encode([
            'message' => 'Senha atualizada com sucesso.',
            'token' => $newToken,
            'user' => [
                'id' => $updatedUser['id'],
                'name' => $updatedUser['name'],
                'email' => $updatedUser['email'],
                'is_admin' => (bool)$updatedUser['is_admin'],
                'is_active' => (bool)$updatedUser['is_active'],
                'force_reset' => (bool)$updatedUser['force_reset']
            ]
        ]);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Ação de autenticação não encontrada']);
    }
}
