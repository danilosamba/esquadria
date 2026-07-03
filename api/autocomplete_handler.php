<?php
// api/autocomplete_handler.php

function handle_autocomplete($pdo, $type) {
    $q = $_GET['q'] ?? '';
    if (empty($q)) {
        echo json_encode([]);
        return;
    }

    if ($type === 'clients') {
        $stmt = $pdo->prepare("
            SELECT id, name, document, phone, email, salesperson, address, architect
            FROM clients
            WHERE name LIKE ? OR document LIKE ? OR phone LIKE ?
            GROUP BY name
            LIMIT 10
        ");
        $stmt->execute(["%$q%", "%$q%", "%$q%"]);
        echo json_encode($stmt->fetchAll());

    } elseif ($type === 'products') {
        $stmt = $pdo->prepare("
            SELECT description, MAX(unit_price) as unit_price, MAX(unit) as unit
            FROM products
            WHERE description LIKE ?
            GROUP BY description
            LIMIT 10
        ");
        $stmt->execute(["%$q%"]);
        echo json_encode($stmt->fetchAll());
    } else {
        echo json_encode([]);
    }
}
