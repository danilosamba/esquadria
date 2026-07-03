<?php
// api/salespersons_handler.php

function handle_salespersons($pdo, $currentUser) {
    $stmt = $pdo->query("SELECT id, name FROM users WHERE is_admin = 0 AND is_active = 1 ORDER BY name ASC");
    $salespersons = $stmt->fetchAll();
    echo json_encode($salespersons);
}
