-- ===================================================================
-- ESTRUCTURA DE BASE DE DATOS PARA SISTEMA DE PROYECTOS CON SENSORES
-- ===================================================================

-- Configuración inicial
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS `ProyectosSensores` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ProyectosSensores`;

-- Agregar campo correo a la tabla usuarios
ALTER TABLE `usuarios` 
ADD COLUMN `correo` varchar(150) DEFAULT NULL COMMENT 'Correo electrónico del usuario' 
AFTER `usuario`;

-- Crear índice único para el correo
ALTER TABLE `usuarios` 
ADD UNIQUE KEY `uk_correo` (`correo`);

-- Agregar índice para consultas por correo
ALTER TABLE `usuarios` 
ADD INDEX `idx_correo_activo` (`correo`, `activo`);

-- ===================================================================
-- 1. TABLA USUARIOS
-- ===================================================================
CREATE TABLE `usuarios` (
  `usuario_id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL COMMENT 'Nombre completo del usuario',
  `usuario` varchar(50) NOT NULL UNIQUE COMMENT 'Nombre de usuario único',
  `contrasena` varchar(255) NOT NULL COMMENT 'Contraseña encriptada',
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`usuario_id`),
  INDEX `idx_usuario_activo` (`usuario`, `activo`),
  INDEX `idx_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de usuarios del sistema';

-- ===================================================================
-- 2. TABLA TIPOS DE SENSORES
-- ===================================================================
CREATE TABLE `tipos_sensores` (
  `tipo_sensor_id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL COMMENT 'Nombre del tipo de sensor (MPU, etc.)',
  `descripcion` text DEFAULT NULL COMMENT 'Descripción del tipo de sensor',
  `parametros_disponibles` json DEFAULT NULL COMMENT 'JSON con los parámetros que maneja este tipo',
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`tipo_sensor_id`),
  UNIQUE KEY `uk_nombre_tipo` (`nombre`),
  INDEX `idx_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tipos de sensores disponibles en el sistema';

-- ===================================================================
-- 3. TABLA PROYECTOS
-- ===================================================================
CREATE TABLE `proyectos` (
  `proyecto_id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `tipo_sensor_id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL COMMENT 'Nombre del proyecto',
  `nombre_topico` varchar(100) NOT NULL COMMENT 'Nombre del tópico MQTT',
  `enlace_topico` varchar(255) NOT NULL COMMENT 'URL/enlace del tópico MQTT',
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del proyecto',
  `activo` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Si el proyecto está activo',
  `fecha_actualizacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`proyecto_id`),
  INDEX `idx_usuario_activo` (`usuario_id`, `activo`),
  INDEX `idx_tipo_sensor` (`tipo_sensor_id`),
  INDEX `idx_fecha` (`fecha`),
  INDEX `idx_topico` (`nombre_topico`),
  CONSTRAINT `fk_proyecto_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`usuario_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_proyecto_tipo_sensor` FOREIGN KEY (`tipo_sensor_id`) REFERENCES `tipos_sensores` (`tipo_sensor_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Proyectos de cada usuario';

-- ===================================================================
-- 4. TABLA PARÁMETROS DE SENSORES (para extensibilidad)
-- ===================================================================
CREATE TABLE `parametros_sensores` (
  `parametro_id` int(11) NOT NULL AUTO_INCREMENT,
  `proyecto_id` int(11) NOT NULL,
  `nombre_parametro` varchar(50) NOT NULL COMMENT 'Nombre del parámetro (x, y, z, etc.)',
  `valor_actual` decimal(10,4) DEFAULT NULL COMMENT 'Último valor registrado',
  `unidad_medida` varchar(20) DEFAULT NULL COMMENT 'Unidad de medida del parámetro',
  `valor_minimo` decimal(10,4) DEFAULT NULL COMMENT 'Valor mínimo permitido',
  `valor_maximo` decimal(10,4) DEFAULT NULL COMMENT 'Valor máximo permitido',
  `fecha_actualizacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`parametro_id`),
  INDEX `idx_proyecto_parametro` (`proyecto_id`, `nombre_parametro`),
  INDEX `idx_activo` (`activo`),
  UNIQUE KEY `uk_proyecto_parametro` (`proyecto_id`, `nombre_parametro`),
  CONSTRAINT `fk_parametro_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`proyecto_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Parámetros específicos de cada sensor en cada proyecto';

-- ===================================================================
-- 5. TABLA LECTURAS (historial de datos del sensor)
-- ===================================================================
CREATE TABLE `lecturas` (
  `lectura_id` int(11) NOT NULL AUTO_INCREMENT,
  `proyecto_id` int(11) NOT NULL,
  `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `datos_json` json NOT NULL COMMENT 'Datos completos del sensor en formato JSON',
  `x_value` decimal(10,4) DEFAULT NULL COMMENT 'Valor X para consultas rápidas',
  `y_value` decimal(10,4) DEFAULT NULL COMMENT 'Valor Y para consultas rápidas',
  `z_value` decimal(10,4) DEFAULT NULL COMMENT 'Valor Z para consultas rápidas',
  PRIMARY KEY (`lectura_id`),
  INDEX `idx_proyecto_timestamp` (`proyecto_id`, `timestamp`),
  INDEX `idx_timestamp` (`timestamp`),
  CONSTRAINT `fk_lectura_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`proyecto_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historial de lecturas de sensores';

-- ===================================================================
-- 6. INSERTAR DATOS INICIALES
-- ===================================================================

-- Insertar tipo de sensor MPU por defecto
INSERT INTO `tipos_sensores` (`nombre`, `descripcion`, `parametros_disponibles`) VALUES
('MPU', 'Sensor MPU (Unidad de Procesamiento de Movimiento)', 
 '{"parametros": ["x", "y", "z"], "descripcion": "Sensor de aceleración y giroscopio", "unidades": {"x": "g", "y": "g", "z": "g"}}');

-- ===================================================================
-- 7. TRIGGERS PARA VALIDACIONES
-- ===================================================================

-- Trigger para validar máximo 2 proyectos por usuario
DELIMITER //
CREATE TRIGGER `tr_validar_max_proyectos` 
BEFORE INSERT ON `proyectos`
FOR EACH ROW
BEGIN
    DECLARE proyecto_count INT;
    
    SELECT COUNT(*) INTO proyecto_count 
    FROM `proyectos` 
    WHERE `usuario_id` = NEW.`usuario_id` AND `activo` = 1;
    
    IF proyecto_count >= 2 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Un usuario no puede tener más de 2 proyectos activos';
    END IF;
END//

-- Trigger para actualizar parámetros del sensor cuando se crea un proyecto MPU
CREATE TRIGGER `tr_crear_parametros_mpu` 
AFTER INSERT ON `proyectos`
FOR EACH ROW
BEGIN
    DECLARE tipo_nombre VARCHAR(50);
    
    SELECT `nombre` INTO tipo_nombre 
    FROM `tipos_sensores` 
    WHERE `tipo_sensor_id` = NEW.`tipo_sensor_id`;
    
    IF tipo_nombre = 'MPU' THEN
        INSERT INTO `parametros_sensores` (`proyecto_id`, `nombre_parametro`, `unidad_medida`) VALUES
        (NEW.`proyecto_id`, 'x', 'g'),
        (NEW.`proyecto_id`, 'y', 'g'),
        (NEW.`proyecto_id`, 'z', 'g');
    END IF;
END//

DELIMITER ;

-- ===================================================================
-- 8. VISTAS ÚTILES
-- ===================================================================

-- Vista para consultar proyectos con información completa
CREATE VIEW `v_proyectos_completos` AS
SELECT 
    p.`proyecto_id`,
    p.`nombre` AS `proyecto_nombre`,
    u.`nombre` AS `usuario_nombre`,
    u.`usuario` AS `usuario_login`,
    ts.`nombre` AS `tipo_sensor`,
    p.`nombre_topico`,
    p.`enlace_topico`,
    p.`fecha`,
    p.`activo`,
    COUNT(ps.`parametro_id`) AS `total_parametros`
FROM `proyectos` p
INNER JOIN `usuarios` u ON p.`usuario_id` = u.`usuario_id`
INNER JOIN `tipos_sensores` ts ON p.`tipo_sensor_id` = ts.`tipo_sensor_id`
LEFT JOIN `parametros_sensores` ps ON p.`proyecto_id` = ps.`proyecto_id` AND ps.`activo` = 1
GROUP BY p.`proyecto_id`;

-- Vista para últimas lecturas de cada proyecto
CREATE VIEW `v_ultimas_lecturas` AS
SELECT 
    p.`proyecto_id`,
    p.`nombre` AS `proyecto_nombre`,
    l.`timestamp`,
    l.`x_value`,
    l.`y_value`,
    l.`z_value`,
    l.`datos_json`
FROM `proyectos` p
INNER JOIN (
    SELECT 
        `proyecto_id`,
        MAX(`timestamp`) AS `max_timestamp`
    FROM `lecturas`
    GROUP BY `proyecto_id`
) latest ON p.`proyecto_id` = latest.`proyecto_id`
INNER JOIN `lecturas` l ON p.`proyecto_id` = l.`proyecto_id` 
    AND l.`timestamp` = latest.`max_timestamp`;

-- ===================================================================
-- 9. PROCEDIMIENTOS ALMACENADOS ÚTILES
-- ===================================================================

-- Procedimiento para crear un nuevo usuario
DELIMITER //
CREATE PROCEDURE `sp_crear_usuario`(
    IN p_nombre VARCHAR(100),
    IN p_usuario VARCHAR(50),
    IN p_contrasena VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO `usuarios` (`nombre`, `usuario`, `contrasena`) 
    VALUES (p_nombre, p_usuario, p_contrasena);
    
    COMMIT;
    
    SELECT LAST_INSERT_ID() as `usuario_id`;
END//

-- Procedimiento para registrar lectura de sensor
CREATE PROCEDURE `sp_registrar_lectura`(
    IN p_proyecto_id INT,
    IN p_x_value DECIMAL(10,4),
    IN p_y_value DECIMAL(10,4),
    IN p_z_value DECIMAL(10,4),
    IN p_datos_completos JSON
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Insertar la lectura
    INSERT INTO `lecturas` (`proyecto_id`, `x_value`, `y_value`, `z_value`, `datos_json`)
    VALUES (p_proyecto_id, p_x_value, p_y_value, p_z_value, p_datos_completos);
    
    -- Actualizar los parámetros individuales
    UPDATE `parametros_sensores` 
    SET `valor_actual` = p_x_value, `fecha_actualizacion` = NOW()
    WHERE `proyecto_id` = p_proyecto_id AND `nombre_parametro` = 'x';
    
    UPDATE `parametros_sensores` 
    SET `valor_actual` = p_y_value, `fecha_actualizacion` = NOW()
    WHERE `proyecto_id` = p_proyecto_id AND `nombre_parametro` = 'y';
    
    UPDATE `parametros_sensores` 
    SET `valor_actual` = p_z_value, `fecha_actualizacion` = NOW()
    WHERE `proyecto_id` = p_proyecto_id AND `nombre_parametro` = 'z';
    
    COMMIT;
    
    SELECT LAST_INSERT_ID() as `lectura_id`;
END//

DELIMITER ;

-- ===================================================================
-- 10. ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ===================================================================

CREATE INDEX `idx_lecturas_timestamp_proyecto` ON `lecturas` (`timestamp`, `proyecto_id`);
CREATE INDEX `idx_parametros_fecha_actualizacion` ON `parametros_sensores` (`fecha_actualizacion`);

-- ===================================================================
-- PROCEDIMIENTO ACTUALIZADO PARA CREAR USUARIO CON CORREO
-- ===================================================================

CREATE PROCEDURE `sp_crear_usuario_completo`(
    IN p_nombre VARCHAR(100),
    IN p_correo VARCHAR(150),
    IN p_usuario VARCHAR(50),
    IN p_contrasena VARCHAR(255),
    IN p_token VARCHAR(100)
)
BEGIN
    DECLARE token_valido INT DEFAULT 0;
    DECLARE usuario_existente INT DEFAULT 0;
    DECLARE nuevo_usuario_id INT DEFAULT 0;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Validar token
    SELECT COUNT(*) INTO token_valido
    FROM `tokens_acceso`
    WHERE `token` = p_token 
      AND `activo` = 1
      AND (`fecha_expiracion` IS NULL OR `fecha_expiracion` > NOW())
      AND (`usos_restantes` IS NULL OR `usos_restantes` > 0);
    
    IF token_valido = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Token de acceso inválido o expirado';
    END IF;
    
    -- Verificar si el usuario o correo ya existen
    SELECT COUNT(*) INTO usuario_existente
    FROM `usuarios`
    WHERE `usuario` = p_usuario OR `correo` = p_correo;
    
    IF usuario_existente > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario o correo ya registrados';
    END IF;
    
    -- Crear el usuario
    INSERT INTO `usuarios` (`nombre`, `correo`, `usuario`, `contrasena`) 
    VALUES (p_nombre, p_correo, p_usuario, p_contrasena);
    
    SET nuevo_usuario_id = LAST_INSERT_ID();
    
    -- Actualizar uso del token si no es ilimitado
    UPDATE `tokens_acceso`
    SET `usos_restantes` = CASE 
        WHEN `usos_restantes` IS NOT NULL THEN `usos_restantes` - 1
        ELSE NULL
    END
    WHERE `token` = p_token;
    
    COMMIT;
    
    SELECT nuevo_usuario_id as `usuario_id`, 'Usuario creado exitosamente' as `mensaje`;
END//

DELIMITER ;

-- ===================================================================
-- VISTA ACTUALIZADA PARA USUARIOS CON CORREO
-- ===================================================================

CREATE OR REPLACE VIEW `v_usuarios_info` AS
SELECT 
    u.`usuario_id`,
    u.`nombre`,
    u.`correo`,
    u.`usuario`,
    u.`fecha_creacion`,
    u.`fecha_actualizacion`,
    u.`activo`,
    COUNT(p.`proyecto_id`) AS `total_proyectos`,
    CASE 
        WHEN COUNT(p.`proyecto_id`) >= 2 THEN 'LIMITE_ALCANZADO'
        WHEN COUNT(p.`proyecto_id`) = 1 THEN 'PUEDE_CREAR_UNO'
        ELSE 'PUEDE_CREAR_DOS'
    END AS `estado_proyectos`
FROM `usuarios` u
LEFT JOIN `proyectos` p ON u.`usuario_id` = p.`usuario_id` AND p.`activo` = 1
WHERE u.`activo` = 1
GROUP BY u.`usuario_id`;

-- ===================================================================
-- ACTUALIZAR DATOS DE EJEMPLO CON CORREOS
-- ===================================================================

-- Actualizar usuarios existentes con correos de ejemplo
UPDATE `usuarios` SET `correo` = 'juan.perez@ejemplo.com' WHERE `usuario` = 'juan.perez';
UPDATE `usuarios` SET `correo` = 'maria.garcia@ejemplo.com' WHERE `usuario` = 'maria.garcia';

-- ===================================================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ===================================================================

-- Índice compuesto para búsquedas de login
CREATE INDEX `idx_login_lookup` ON `usuarios` (`usuario`, `activo`, `contrasena`);

-- Índice para consultas de tokens activos
CREATE INDEX `idx_tokens_activos` ON `tokens_acceso` (`activo`, `fecha_expiracion`, `usos_restantes`);

-- ===================================================================
-- 11. DATOS DE EJEMPLO
-- ===================================================================

-- Usuario de ejemplo
INSERT INTO `usuarios` (`nombre`, `usuario`, `contrasena`) VALUES
('Juan Pérez', 'juan.perez', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'), -- password: "password"
('María García', 'maria.garcia', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Proyectos de ejemplo
INSERT INTO `proyectos` (`usuario_id`, `tipo_sensor_id`, `nombre`, `nombre_topico`, `enlace_topico`) VALUES
(1, 1, 'Proyecto Movimiento Casa', 'casa/movimiento', 'mqtt://broker.example.com:1883/casa/movimiento'),
(1, 1, 'Proyecto Vibración Máquina', 'fabrica/maquina1/vibracion', 'mqtt://broker.example.com:1883/fabrica/maquina1/vibracion'),
(2, 1, 'Monitoreo Deportivo', 'deporte/actividad', 'mqtt://broker.example.com:1883/deporte/actividad');

-- Lecturas de ejemplo
INSERT INTO `lecturas` (`proyecto_id`, `x_value`, `y_value`, `z_value`, `datos_json`) VALUES
(1, 0.25, -0.15, 9.81, '{"x": 0.25, "y": -0.15, "z": 9.81, "temperatura": 23.5, "timestamp": "2025-09-08T10:30:00Z"}'),
(1, 0.30, -0.18, 9.85, '{"x": 0.30, "y": -0.18, "z": 9.85, "temperatura": 23.7, "timestamp": "2025-09-08T10:31:00Z"}'),
(2, 1.25, 0.85, 8.95, '{"x": 1.25, "y": 0.85, "z": 8.95, "temperatura": 45.2, "timestamp": "2025-09-08T10:30:00Z"}');

COMMIT;

-- ===================================================================
-- RESUMEN DE LA ESTRUCTURA
-- ===================================================================
/*
✅ TABLAS PRINCIPALES:
   - usuarios: Almacena información de usuarios (máximo 2 proyectos)
   - tipos_sensores: Tipos de sensores disponibles (MPU inicialmente)
   - proyectos: Proyectos de cada usuario con información del tópico
   - parametros_sensores: Parámetros X, Y, Z de cada proyecto
   - lecturas: Historial de todas las lecturas de sensores

✅ CARACTERÍSTICAS:
   - Limitación de 2 proyectos por usuario (validado por trigger)
   - Soporte para sensor MPU con parámetros X, Y, Z
   - Almacenamiento de información del tópico MQTT
   - Extensible para agregar nuevos tipos de sensores
   - Índices optimizados para consultas frecuentes
   - Vistas para consultas complejas
   - Procedimientos almacenados para operaciones comunes

✅ SEGURIDAD:
   - Contraseñas preparadas para encriptación
   - Constraints de integridad referencial
   - Validaciones por triggers
   - Campos de auditoría (fechas de creación/actualización)
*/

SELECT '🚀 BASE DE DATOS CONFIGURADA CORRECTAMENTE' as ESTADO;