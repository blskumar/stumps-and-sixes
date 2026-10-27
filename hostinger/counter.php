<?php
/**
 * Stumps & Sixes - tiny privacy-friendly visit counter for Hostinger (PHP hosting).
 *
 * Counts only: visits and matches started, per day. It stores NO IP addresses,
 * cookies, names or scores.
 *
 * Setup
 *   1. Upload this file to a folder on your Hostinger site, e.g. public_html/counter/counter.php
 *   2. Change SECRET below to a long random string.
 *   3. Game pings:   https://YOUR-HOSTINGER-DOMAIN/counter/counter.php?e=visit   (sent by the game)
 *   4. See numbers:  https://YOUR-HOSTINGER-DOMAIN/counter/counter.php?stats=1&key=SECRET
 */
const SECRET  = 'CHANGE-ME-TO-A-LONG-RANDOM-STRING';
const ORIGINS = ['https://stumpsnd6s.space', 'https://www.stumpsnd6s.space', 'https://blskumar.github.io'];
const EVENTS  = ['visit', 'match'];
$file = __DIR__ . '/counts.json';

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

function load($file) {
    $d = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
    return is_array($d) ? $d : [];
}

// Read the numbers (needs the secret key)
if (isset($_GET['stats'])) {
    if (!hash_equals(SECRET, (string) ($_GET['key'] ?? ''))) { http_response_code(403); exit('forbidden'); }
    $d = load($file);
    ksort($d);
    $tot = ['visit' => 0, 'match' => 0];
    foreach ($d as $day) foreach ($tot as $k => $_) $tot[$k] += (int) ($day[$k] ?? 0);
    header('Content-Type: application/json');
    echo json_encode(['totals' => $tot, 'days' => $d], JSON_PRETTY_PRINT);
    exit;
}

// Count one event
$e = (string) ($_GET['e'] ?? $_POST['e'] ?? '');
if (!in_array($e, EVENTS, true)) { http_response_code(400); exit('bad event'); }
$fh = fopen($file, 'c+');
if (!$fh) { http_response_code(500); exit; }
flock($fh, LOCK_EX);
$d = json_decode((string) stream_get_contents($fh), true);
if (!is_array($d)) $d = [];
$day = gmdate('Y-m-d');
$d[$day][$e] = (int) ($d[$day][$e] ?? 0) + 1;
if (count($d) > 800) { ksort($d); $d = array_slice($d, -800, null, true); }
ftruncate($fh, 0); rewind($fh);
fwrite($fh, json_encode($d));
fflush($fh); flock($fh, LOCK_UN); fclose($fh);
http_response_code(204);
