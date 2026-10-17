import subprocess

php_code = r"""
chdir('/var/www/html/glpi');
require 'vendor/autoload.php';
$k = new Glpi\Kernel\Kernel();
$k->boot();

$client = new APIClient();
$client->getFromDB(2);
echo "Client 2 name: " . $client->fields['name'] . PHP_EOL;
echo "Client 2 app_token in DB: " . $client->fields['app_token'] . PHP_EOL;
// How does GLPI generate or regenerate app_token?
$ref = new ReflectionClass($client);
foreach ($ref->getMethods() as $m) {
    if (stripos($m->getName(), 'token') !== false) {
        echo "Method: " . $m->getName() . PHP_EOL;
    }
}
"""

subprocess.run(["ssh", "zqrey@glpi", f"cat << 'EOF' > /tmp/check_apiclient.php\n<?php\n{php_code}\nEOF\ndocker cp /tmp/check_apiclient.php glpi-app:/tmp/check_apiclient.php\ndocker exec -u www-data glpi-app php /tmp/check_apiclient.php\nrm /tmp/check_apiclient.php\n"], text=True)
