-- ===================================================================
-- ESTRUCTURA SIMPLIFICADA PARA DEPURACIÓN
-- ===================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- Usar la base de datos (ya creada por Docker)
USE `ProyectosSensores`;

-- ===================================================================
-- 1. TABLA USUARIOS (CON CORREO INCLUIDO)
-- ===================================================================
CREATE TABLE IF NOT EXISTS `usuarios` (
  `usuario_id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL COMMENT 'Nombre completo del usuario',
  `usuario` varchar(50) NOT NULL COMMENT 'Nombre de usuario único',
  `correo` varchar(150) DEFAULT NULL COMMENT 'Correo electrónico del usuario',
  `contrasena` varchar(255) NOT NULL COMMENT 'Contraseña encriptada',
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`usuario_id`),
  UNIQUE KEY `uk_usuario` (`usuario`),
  UNIQUE KEY `uk_correo` (`correo`),
  INDEX `idx_usuario_activo` (`usuario`, `activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 2. TABLA TIPOS DE SENSORES
-- ===================================================================
CREATE TABLE IF NOT EXISTS `tipos_sensores` (
  `tipo_sensor_id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL COMMENT 'Nombre del tipo de sensor',
  `descripcion` text DEFAULT NULL COMMENT 'Descripción del tipo de sensor',
  `parametros_disponibles` json DEFAULT NULL COMMENT 'JSON con los parámetros',
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`tipo_sensor_id`),
  UNIQUE KEY `uk_nombre_tipo` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 3. TABLA PROYECTOS
-- ===================================================================
CREATE TABLE IF NOT EXISTS `proyectos` (
  `proyecto_id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `tipo_sensor_id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL COMMENT 'Nombre del proyecto',
  `nombre_topico` varchar(100) NOT NULL COMMENT 'Nombre del tópico MQTT',
  `enlace_topico` varchar(255) NOT NULL COMMENT 'URL/enlace del tópico MQTT',
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_actualizacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`proyecto_id`),
  INDEX `idx_usuario_activo` (`usuario_id`, `activo`),
  CONSTRAINT `fk_proyecto_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`usuario_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_proyecto_tipo_sensor` FOREIGN KEY (`tipo_sensor_id`) REFERENCES `tipos_sensores` (`tipo_sensor_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 4. TABLA PARÁMETROS DE SENSORES
-- ===================================================================
CREATE TABLE IF NOT EXISTS `parametros_sensores` (
  `parametro_id` int(11) NOT NULL AUTO_INCREMENT,
  `proyecto_id` int(11) NOT NULL,
  `nombre_parametro` varchar(50) NOT NULL COMMENT 'Nombre del parámetro (x, y, z)',
  `unidad_medida` varchar(20) DEFAULT NULL COMMENT 'Unidad de medida',
  `valor_actual` decimal(10,4) DEFAULT NULL COMMENT 'Último valor registrado',
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`parametro_id`),
  INDEX `idx_proyecto_parametro` (`proyecto_id`, `nombre_parametro`),
  CONSTRAINT `fk_parametro_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`proyecto_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 5. TABLA LECTURAS
-- ===================================================================
CREATE TABLE IF NOT EXISTS `lecturas` (
  `lectura_id` int(11) NOT NULL AUTO_INCREMENT,
  `proyecto_id` int(11) NOT NULL,
  `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `x_value` decimal(10,4) DEFAULT NULL COMMENT 'Valor del eje X',
  `y_value` decimal(10,4) DEFAULT NULL COMMENT 'Valor del eje Y', 
  `z_value` decimal(10,4) DEFAULT NULL COMMENT 'Valor del eje Z',
  `datos_json` json DEFAULT NULL COMMENT 'Datos completos en JSON',
  PRIMARY KEY (`lectura_id`),
  INDEX `idx_proyecto_timestamp` (`proyecto_id`, `timestamp`),
  CONSTRAINT `fk_lectura_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`proyecto_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- 6. INSERTAR DATOS INICIALES
-- ===================================================================

-- Insertar tipo de sensor MPU
INSERT IGNORE INTO `tipos_sensores` (`nombre`, `descripcion`, `parametros_disponibles`) VALUES
('MPU', 'Sensor MPU (Unidad de Procesamiento de Movimiento)', 
 '{"parametros": ["x", "y", "z"], "descripcion": "Sensor de aceleración y giroscopio"}');

-- Insertar usuarios de ejemplo (password: "password" encriptada con bcrypt)
INSERT IGNORE INTO `usuarios` (`nombre`, `usuario`, `correo`, `contrasena`) VALUES
('Juan Pérez', 'juan.perez', 'juan.perez@ejemplo.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('María García', 'maria.garcia', 'maria.garcia@ejemplo.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('Usuario Test', 'test', 'test@ejemplo.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Insertar proyectos de ejemplo
INSERT IGNORE INTO `proyectos` (`usuario_id`, `tipo_sensor_id`, `nombre`, `nombre_topico`, `enlace_topico`) VALUES
(1, 1, 'Proyecto Movimiento Casa', 'casa/movimiento', 'mqtt://mosquitto:1883/casa/movimiento'),
(2, 1, 'Monitoreo Deportivo', 'deporte/actividad', 'mqtt://mosquitto:1883/deporte/actividad');

COMMIT;

-- ===================================================================
-- 7. VERIFICACIÓN
-- ===================================================================
SELECT 'TABLAS CREADAS CORRECTAMENTE' as ESTADO;
SELECT COUNT(*) as USUARIOS_CREADOS FROM usuarios;
SELECT COUNT(*) as TIPOS_SENSORES FROM tipos_sensores;
SELECT COUNT(*) as PROYECTOS_EJEMPLO FROM proyectos;