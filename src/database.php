<?php
class Database
{
    private $host;
    private $user;
    private $pass;
    private $db;
    private $charset = 'utf8mb4';
    private $pdo = null;

    public function __construct()
    {
        // ดึงค่าจาก Environment Variables
        $this->host = getenv('DB_HOST') ?: 'mysql';
        $this->user = getenv('DB_USER') ?: 'root';
        $this->pass = getenv('DB_PASSWORD') ?: '1234';
        $this->db   = getenv('DB_NAME') ?: 'db_amita';
    }
    public function getConnection()
    {
        if ($this->pdo !== null) {
            return $this->pdo;
        }

        $dsn = "mysql:host={$this->host};dbname={$this->db};charset={$this->charset}";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $this->pdo = new PDO($dsn, $this->user, $this->pass, $options);
            return $this->pdo;
        } catch (PDOException $e) {
            die("Connection Failed: " . $e->getMessage());
        }
    }
}
