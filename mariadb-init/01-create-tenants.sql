-- Crear esquemas para estudios (multi-tenant)
CREATE DATABASE IF NOT EXISTS juridictas_estudio_perez CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS juridictas_estudio_gomez CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS juridictas_estudio_rodriguez CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Dar permisos al usuario juridictas sobre todos los esquemas
GRANT ALL PRIVILEGES ON `juridictas\_%`.* TO 'juridictas'@'%';
FLUSH PRIVILEGES;