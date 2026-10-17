import subprocess

php_code = r"""
chdir('/var/www/html/glpi');
require 'vendor/autoload.php';
$k = new Glpi\Kernel\Kernel();
$k->boot();
global $DB;

$u = new User();
$u->getFromDB(10);
$token = $u->fields['api_token'];
if (empty($token)) {
    // Generate 40-char token
    $token = bin2hex(random_bytes(20));
    $DB->update('glpi_users', ['api_token' => $token], ['id' => 10]);
    echo "Generated api_token for user Telegram (id 10): " . $token . PHP_EOL;
} else {
    echo "User Telegram already has api_token: " . $token . PHP_EOL;
}
"""

subprocess.run(["ssh", "zqrey@glpi", f"cat << 'EOF' > /tmp/setup_user.php\n<?php\n{php_code}\nEOF\ndocker cp /tmp/setup_user.php glpi-app:/tmp/setup_user.php\ndocker exec -u www-data glpi-app php /tmp/setup_user.php\nrm /tmp/setup_user.php\n"], text=True)
