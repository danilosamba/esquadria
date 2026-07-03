<?php
// api/users_handler.php

function handle_users($pdo, $currentUser, $id, $action) {
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);

    if ($method === 'GET') {
        if ($currentUser['is_admin']) {
            $stmt = $pdo->query("
                SELECT u.id, u.name, u.email, u.is_admin, u.is_active, u.created_at,
                       (SELECT COUNT(*) FROM budgets b WHERE b.user_id = u.id) as budget_count
                FROM users u
                ORDER BY u.name ASC
            ");
            $users = $stmt->fetchAll();

            // Format types for JSON
            foreach ($users as &$u) {
                $u['is_admin'] = (bool)$u['is_admin'];
                $u['is_active'] = (bool)$u['is_active'];
            }
        } else {
            // Non-admin can only see id and name of active users
            $stmt = $pdo->query("
                SELECT u.id, u.name
                FROM users u
                WHERE u.is_active = 1
                ORDER BY u.name ASC
            ");
            $users = $stmt->fetchAll();
        }

        echo json_encode($users);
        return;
    }

    // POST, PUT, DELETE remain admin only
    if (!$currentUser['is_admin']) {
        http_response_code(403);
        echo json_encode(['error' => 'Acesso negado']);
        return;
    }

    if ($method === 'POST') {
        $name = $input['name'] ?? '';
        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['error' => 'O primeiro nome é obrigatório']);
            return;
        }

        $stmt = $pdo->prepare("SELECT id FROM users WHERE name = ?");
        $stmt->execute([$name]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['error' => 'Já existe um usuário com esse nome']);
            return;
        }

        // Create a UUID
        $newId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );

        $dummyEmail = $newId . '@luz.local';
        $hash = password_hash('142536', PASSWORD_BCRYPT);
        $now = round(microtime(true) * 1000);

        $stmt = $pdo->prepare("INSERT INTO users (id, name, email, password, is_active, force_reset, created_at) VALUES (?, ?, ?, ?, 1, 1, ?)");
        $stmt->execute([$newId, $name, $dummyEmail, $hash, $now]);

        log_access($pdo, $currentUser['id'], 'CREATE_USER', "Criou o usuário $name");

        echo json_encode(['message' => 'Usuário cadastrado com sucesso!']);

    } elseif ($method === 'PUT') {
        if ($action === 'reset-password') {
            $hash = password_hash('142536', PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("UPDATE users SET password = ?, force_reset = 1 WHERE id = ?");
            $stmt->execute([$hash, $id]);

            log_access($pdo, $currentUser['id'], 'ADMIN_RESET_PASSWORD', "Redefiniu a senha do usuário ID $id");
            echo json_encode(['message' => 'Senha redefinida para a padrão (142536)']);

        } elseif ($action === 'toggle') {
            if ($id === $currentUser['id']) {
                http_response_code(400);
                echo json_encode(['error' => 'Você não pode alterar seu próprio status.']);
                return;
            }

            $stmt = $pdo->prepare("SELECT is_admin FROM users WHERE id = ?");
            $stmt->execute([$id]);
            $userToUpdate = $stmt->fetch();

            if (!$userToUpdate) {
                http_response_code(404);
                echo json_encode(['error' => 'Usuário não encontrado']);
                return;
            }

            if ($userToUpdate['is_admin']) {
                http_response_code(400);
                echo json_encode(['error' => 'Não é possível desativar um administrador.']);
                return;
            }

            $isActive = $input['is_active'] ? 1 : 0;
            $stmt = $pdo->prepare("UPDATE users SET is_active = ? WHERE id = ?");
            $stmt->execute([$isActive, $id]);

            log_access($pdo, $currentUser['id'], 'TOGGLE_USER_STATUS', "Alterou status do usuário ID $id para " . ($isActive ? 'Ativo' : 'Inativo'));
            echo json_encode(['message' => 'Status atualizado com sucesso']);
        }

    } elseif ($method === 'DELETE') {
        if ($id === $currentUser['id']) {
            http_response_code(400);
            echo json_encode(['error' => 'Você não pode excluir seu próprio usuário.']);
            return;
        }

        $stmt = $pdo->prepare("SELECT is_admin FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $userToUpdate = $stmt->fetch();

        if (!$userToUpdate) {
            http_response_code(404);
            echo json_encode(['error' => 'Usuário não encontrado']);
            return;
        }

        if ($userToUpdate['is_admin']) {
            http_response_code(400);
            echo json_encode(['error' => 'Não é possível excluir um administrador.']);
            return;
        }

        $stmt = $pdo->prepare("SELECT COUNT(*) as c FROM budgets WHERE user_id = ?");
        $stmt->execute([$id]);
        $res = $stmt->fetch();

        if ($res['c'] > 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Não é possível excluir um usuário que possui orçamentos associados. Desative o acesso dele em vez disso.']);
            return;
        }

        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);

        log_access($pdo, $currentUser['id'], 'DELETE_USER', "Excluiu o usuário ID $id");
        echo json_encode(['message' => 'Usuário excluído com sucesso']);
    }
}
