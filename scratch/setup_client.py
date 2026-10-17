import subprocess

php_code = r"""
chdir('/var/www/html/glpi');
require 'vendor/autoload.php';
$k = new Glpi\Kernel\Kernel();
$k->boot();
global $DB;

// Check if client exists
$res = $DB->request('glpi_apiclients', ['name' => 'Hospital Badges']);
$exists = false;
foreach ($res as $r) {
    $exists = true;
    echo "Found existing client ID: " . $r['id'] . " app_token: " . $r['app_token'] . PHP_EOL;
    $DB->update('glpi_apiclients', [
        'ipv4_range_start' => '2886729728',
        'ipv4_range_end' => '2886795263',
        'is_active' => 1
    ], ['id' => $r['id']]);
    echo "Updated IP range to 172.16.0.0 - 172.16.255.255" . PHP_EOL;
}

if (!$exists) {
    $token = bin2hex(random_bytes(32));
    $DB->insert('glpi_apiclients', [
        'name' => 'Hospital Badges',
        'is_active' => 1,
        'app_token' => $token,
        'ipv4_range_start' => '2886729728',
        'ipv4_range_end' => '2886795263',
        'date_creation' => date('Y-m-d H:i:s'),
        'date_mod' => date('Y-m-d H:i:s')
    ]);
    echo "Created new client 'Hospital Badges' with app_token: " . $token . PHP_EOL;
}
"""

subprocess.run(["ssh", "zqrey@glpi", f"cat << 'EOF' > /tmp/setup_client.php\n<?php\n{php_code}\nEOF\ndocker cp /tmp/setup_client.php glpi-app:/tmp/setup_client.php\ndocker exec -u www-data glpi-app php /tmp/setup_client.php\nrm /tmp/setup_client.php\n"], text=True)
