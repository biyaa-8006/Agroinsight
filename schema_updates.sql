-- AgroInsight — run after schema.sql (phpMyAdmin or mysql CLI)
USE `agroinsight`;

CREATE TABLE IF NOT EXISTS `system_config` (
  `config_key`   varchar(80) NOT NULL,
  `config_value` text NOT NULL,
  `updated_at`   timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `system_config` (`config_key`, `config_value`) VALUES
('default_city', 'Faisalabad'),
('alert_temp_critical', '42'),
('alert_wind_high', '15'),
('alert_rain_heavy', '50'),
('platform_name', 'AgroInsight')
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`);

CREATE TABLE IF NOT EXISTS `crop_reminders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `crop_id` int(11) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `due_date` date NOT NULL,
  `is_done` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_rem_user` (`user_id`),
  CONSTRAINT `fk_rem_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rem_crop` FOREIGN KEY (`crop_id`) REFERENCES `crops` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sms_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `message` text NOT NULL,
  `status` enum('sent','queued','failed','mock') NOT NULL DEFAULT 'queued',
  `provider_ref` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sms_user` (`user_id`),
  CONSTRAINT `fk_sms_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
