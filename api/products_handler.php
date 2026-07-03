<?php
// api/products_handler.php

function handle_products($pdo, $currentUser, $id = null) {
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);

    if ($method === 'GET') {
        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode($stmt->fetch());
        } else {
            $stmt = $pdo->query("SELECT * FROM products ORDER BY description ASC");
            echo json_encode($stmt->fetchAll());
        }
        return;
    }

    if (!$currentUser['is_admin']) {
        http_response_code(403);
        echo json_encode(['error' => 'Acesso negado']);
        return;
    }

    if ($method === 'POST') {
        $description = $input['description'] ?? '';
        $unit_price = $input['unit_price'] ?? 0;
        $unit = $input['unit'] ?? 'M';

        if (empty($description)) {
            http_response_code(400);
            echo json_encode(['error' => 'Descrição é obrigatória']);
            return;
        }

        $newId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );

        $stmt = $pdo->prepare("INSERT INTO products (id, description, unit_price, unit) VALUES (?, ?, ?, ?)");
        try {
            $stmt->execute([$newId, $description, $unit_price, $unit]);
            echo json_encode(['message' => 'Produto cadastrado com sucesso!', 'id' => $newId]);
        } catch (PDOException $e) {
            http_response_code(400);
            echo json_encode(['error' => 'Erro ao cadastrar produto: ' . $e->getMessage()]);
        }

    } elseif ($method === 'PUT' && $id) {
        $description = $input['description'] ?? '';
        $unit_price = $input['unit_price'] ?? 0;
        $unit = $input['unit'] ?? 'M';

        $stmt = $pdo->prepare("UPDATE products SET description = ?, unit_price = ?, unit = ? WHERE id = ?");
        $stmt->execute([$description, $unit_price, $unit, $id]);
        echo json_encode(['message' => 'Produto atualizado com sucesso!']);

    } elseif ($method === 'DELETE' && $id) {
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['message' => 'Produto excluído com sucesso!']);
    }
}
