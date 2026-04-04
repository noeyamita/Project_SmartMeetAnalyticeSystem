<?php
class Database
{
    private $host;
    private $user;
    private $pass;
    private $db;
    private $charset = 'utf8mb4';
    private $pdo = null;
    private $port;

    public function __construct()
    {
        $this->host = getenv('DB_HOST') ?: 'mysql';
        $this->user = getenv('DB_USER') ?: 'root';
        $this->pass = getenv('DB_PASSWORD') ?: '1234';
        $this->db   = getenv('DB_NAME') ?: 'db_amita';
        $this->port = getenv('DB_PORT') ?: '3306';
    }

    public function getConnection()
    {
        if ($this->pdo !== null) {
            return $this->pdo;
        }

        $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->db};charset={$this->charset}";

        try {
            $this->pdo = new PDO($dsn, $this->user, $this->pass, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
            return $this->pdo;
        } catch (PDOException $e) {
            // ✅ ส่ง JSON error แทน die()
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Database connection failed']);
            exit;
        }
    }
}
