<?php
// api/budgets_handler.php

function handle_budgets($pdo, $currentUser, $id, $action) {
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);

    if ($method === 'GET') {
        // Now everyone can fetch all budgets to allow "View All" mode in frontend
        $stmt = $pdo->query("SELECT * FROM budgets ORDER BY created_at DESC");
        $budgets = $stmt->fetchAll();

        $result = [];
        foreach ($budgets as $b) {
            $data = json_decode($b['data'], true);
            if ($data) {
                $data['user_id'] = $b['user_id'];
                $result[] = $data;
            }
        }
        echo json_encode($result);

    } elseif ($method === 'POST') {
        $budget = $input;
        if (!isset($budget['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID do orçamento inválido']);
            return;
        }

        $stmt = $pdo->prepare("SELECT id, user_id FROM budgets WHERE id = ?");
        $stmt->execute([$budget['id']]);
        $existing = $stmt->fetch();

        if ($existing) {
            if (!$currentUser['is_admin'] && $existing['user_id'] !== $currentUser['id']) {
                http_response_code(403);
                echo json_encode(['error' => 'Não autorizado a modificar este orçamento']);
                return;
            }
            $stmt = $pdo->prepare("UPDATE budgets SET data = ? WHERE id = ?");
            $stmt->execute([json_encode($budget), $budget['id']]);
            log_access($pdo, $currentUser['id'], 'UPDATE_BUDGET', "Atualizou orçamento " . $budget['id']);
        } else {
            $now = round(microtime(true) * 1000);
            $stmt = $pdo->prepare("INSERT INTO budgets (id, user_id, data, created_at) VALUES (?, ?, ?, ?)");
            $stmt->execute([$budget['id'], $currentUser['id'], json_encode($budget), $now]);
            log_access($pdo, $currentUser['id'], 'CREATE_BUDGET', "Criou orçamento " . $budget['id']);
        }

        // Save client for autocomplete
        if (isset($budget['client']['name']) && !empty($budget['client']['name'])) {
            $client = $budget['client'];
            $stmt = $pdo->prepare("SELECT id FROM clients WHERE name = ?");
            $stmt->execute([$client['name']]);
            $existingClient = $stmt->fetch();

            if ($existingClient) {
                $stmt = $pdo->prepare("UPDATE clients SET document=?, address=?, phone=?, email=?, architect=?, salesperson=? WHERE id=?");
                $stmt->execute([
                    $client['document'] ?? '',
                    $client['address'] ?? '',
                    $client['phone'] ?? '',
                    $client['email'] ?? '',
                    $client['architect'] ?? '',
                    $client['salesperson'] ?? '',
                    $existingClient['id']
                ]);
            } else {
                $clientId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
                    mt_rand(0, 0xffff), mt_rand(0, 0xffff),
                    mt_rand(0, 0xffff),
                    mt_rand(0, 0x0fff) | 0x4000,
                    mt_rand(0, 0x3fff) | 0x8000,
                    mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
                );
                $stmt = $pdo->prepare("INSERT INTO clients (id, name, document, address, phone, email, architect, salesperson, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $clientId,
                    $client['name'],
                    $client['document'] ?? '',
                    $client['address'] ?? '',
                    $client['phone'] ?? '',
                    $client['email'] ?? '',
                    $client['architect'] ?? '',
                    $client['salesperson'] ?? '',
                    round(microtime(true) * 1000)
                ]);
            }
        }

        // Save products for autocomplete
        if (isset($budget['items']) && is_array($budget['items'])) {
            foreach ($budget['items'] as $item) {
                if (!empty($item['description'])) {
                    $stmt = $pdo->prepare("SELECT id FROM products WHERE description = ?");
                    $stmt->execute([$item['description']]);
                    if ($stmt->fetch()) {
                        $stmt = $pdo->prepare("UPDATE products SET unit_price = ? WHERE description = ?");
                        $stmt->execute([$item['unitPrice'] ?? 0, $item['description']]);
                    } else {
                        $prodId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
                            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
                            mt_rand(0, 0xffff),
                            mt_rand(0, 0x0fff) | 0x4000,
                            mt_rand(0, 0x3fff) | 0x8000,
                            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
                        );
                        $stmt = $pdo->prepare("INSERT INTO products (id, description, unit_price) VALUES (?, ?, ?)");
                        $stmt->execute([$prodId, $item['description'], $item['unitPrice'] ?? 0]);
                    }
                }
            }
        }

        echo json_encode(['success' => true]);

    } elseif ($method === 'DELETE') {
        $stmt = $pdo->prepare("SELECT user_id FROM budgets WHERE id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch();

        if (!$existing) {
            http_response_code(404);
            echo json_encode(['error' => 'Não encontrado']);
            return;
        }

        if (!$currentUser['is_admin'] && $existing['user_id'] !== $currentUser['id']) {
            http_response_code(403);
            echo json_encode(['error' => 'Não autorizado']);
            return;
        }

        $stmt = $pdo->prepare("DELETE FROM budgets WHERE id = ?");
        $stmt->execute([$id]);

        log_access($pdo, $currentUser['id'], 'DELETE_BUDGET', "Excluiu orçamento $id");
        echo json_encode(['success' => true]);
    }
}
