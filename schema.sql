-- AgroInsight — production schema (MySQL 8 / MariaDB 10.4+)
-- Import via phpMyAdmin or: mysql -u root < database/schema.sql

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `agroinsight` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `agroinsight`;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','farmer') NOT NULL DEFAULT 'farmer',
  `region` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- crops (10 Pakistan-relevant crops)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `crops` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `min_temp` decimal(5,2) DEFAULT NULL,
  `max_temp` decimal(5,2) DEFAULT NULL,
  `min_humidity` decimal(5,2) DEFAULT NULL,
  `max_humidity` decimal(5,2) DEFAULT NULL,
  `min_rainfall` decimal(5,2) DEFAULT NULL,
  `max_rainfall` decimal(5,2) DEFAULT NULL,
  `growing_season` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_crops_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `crops` (`id`, `name`, `min_temp`, `max_temp`, `min_humidity`, `max_humidity`, `min_rainfall`, `max_rainfall`, `growing_season`) VALUES
(1, 'Wheat', 12.00, 25.00, 40.00, 70.00, 300.00, 600.00, 'Oct-Mar'),
(2, 'Rice', 20.00, 35.00, 70.00, 90.00, 800.00, 2500.00, 'Jun-Nov'),
(3, 'Cotton', 20.00, 40.00, 40.00, 60.00, 500.00, 700.00, 'Apr-Oct'),
(4, 'Sugarcane', 24.00, 38.00, 60.00, 80.00, 1000.00, 2000.00, 'Feb-Jan'),
(5, 'Maize', 15.00, 30.00, 50.00, 75.00, 400.00, 800.00, 'Mar-Sep'),
(6, 'Potato', 15.00, 20.00, 60.00, 80.00, 300.00, 500.00, 'Oct-Mar'),
(7, 'Onion', 13.00, 24.00, 50.00, 70.00, 250.00, 450.00, 'Nov-Apr'),
(8, 'Mango', 24.00, 27.00, 50.00, 70.00, 600.00, 1200.00, 'Feb-Jul'),
(9, 'Tomato', 18.00, 27.00, 55.00, 75.00, 400.00, 700.00, 'Year-round'),
(10, 'Chickpea', 18.00, 26.00, 40.00, 60.00, 250.00, 400.00, 'Oct-Mar')
ON DUPLICATE KEY UPDATE
  `min_temp` = VALUES(`min_temp`),
  `max_temp` = VALUES(`max_temp`),
  `min_humidity` = VALUES(`min_humidity`),
  `max_humidity` = VALUES(`max_humidity`),
  `min_rainfall` = VALUES(`min_rainfall`),
  `max_rainfall` = VALUES(`max_rainfall`),
  `growing_season` = VALUES(`growing_season`);

-- ---------------------------------------------------------------------------
-- weather_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `weather_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `temperature` decimal(5,2) DEFAULT NULL,
  `humidity` decimal(5,2) DEFAULT NULL,
  `rainfall` decimal(5,2) DEFAULT NULL,
  `wind_speed` decimal(5,2) DEFAULT NULL,
  `condition_text` varchar(100) DEFAULT NULL,
  `recorded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_weather_user` (`user_id`),
  KEY `idx_weather_location_time` (`location`, `recorded_at`),
  CONSTRAINT `fk_weather_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- predictions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `predictions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `crop_id` int(11) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `risk_level` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `risk_score` decimal(5,2) DEFAULT NULL,
  `recommendation` text DEFAULT NULL,
  `model_probability` decimal(5,4) DEFAULT NULL,
  `predicted_crop` varchar(80) DEFAULT NULL,
  `predicted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_predictions_user` (`user_id`),
  KEY `idx_predictions_crop` (`crop_id`),
  KEY `idx_predictions_time` (`predicted_at`),
  CONSTRAINT `fk_pred_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_pred_crop` FOREIGN KEY (`crop_id`) REFERENCES `crops` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- alerts (severity includes critical)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `alerts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `crop_id` int(11) DEFAULT NULL,
  `alert_type` varchar(50) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'low',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_alerts_user` (`user_id`),
  KEY `idx_alerts_crop` (`crop_id`),
  CONSTRAINT `fk_alert_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_alert_crop` FOREIGN KEY (`crop_id`) REFERENCES `crops` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- economic / analytics reference data (seeded, editable)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `crop_market_prices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `crop_name` varchar(80) NOT NULL,
  `unit` varchar(40) NOT NULL,
  `price_current` decimal(12,2) NOT NULL,
  `price_week_ago` decimal(12,2) NOT NULL,
  `price_month_ago` decimal(12,2) NOT NULL,
  `shock_cause` varchar(60) NOT NULL DEFAULT 'Normal',
  `severity` enum('low','moderate','high','critical') NOT NULL DEFAULT 'low',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_market_crop` (`crop_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `crop_market_prices` (`crop_name`, `unit`, `price_current`, `price_week_ago`, `price_month_ago`, `shock_cause`, `severity`) VALUES
('Wheat', 'Rs/40kg', 3800, 3650, 3200, 'Flood', 'critical'),
('Basmati Rice', 'Rs/kg', 420, 400, 380, 'Heatwave', 'high'),
('Cotton', 'Rs/maund', 8500, 8200, 7800, 'Flood', 'critical'),
('Sugarcane', 'Rs/maund', 350, 340, 320, 'Drought', 'moderate'),
('Maize', 'Rs/40kg', 2800, 2750, 2600, 'Normal', 'low'),
('Onion', 'Rs/kg', 180, 150, 90, 'Drought', 'high'),
('Potato', 'Rs/kg', 85, 75, 65, 'Flood', 'moderate'),
('Tomato', 'Rs/kg', 120, 110, 95, 'Normal', 'low'),
('Chickpea', 'Rs/kg', 210, 200, 185, 'Normal', 'low'),
('Mango', 'Rs/kg', 95, 88, 75, 'Heatwave', 'moderate')
ON DUPLICATE KEY UPDATE
  `price_current` = VALUES(`price_current`),
  `price_week_ago` = VALUES(`price_week_ago`),
  `price_month_ago` = VALUES(`price_month_ago`),
  `shock_cause` = VALUES(`shock_cause`),
  `severity` = VALUES(`severity`);

CREATE TABLE IF NOT EXISTS `district_yields` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `district` varchar(80) NOT NULL,
  `province` varchar(40) NOT NULL DEFAULT 'Punjab',
  `crop_id` int(11) NOT NULL,
  `yield_t_ha` decimal(6,2) NOT NULL,
  `season` varchar(20) NOT NULL DEFAULT 'Kharif',
  `year` smallint NOT NULL DEFAULT 2025,
  PRIMARY KEY (`id`),
  KEY `idx_dy_crop` (`crop_id`),
  UNIQUE KEY `uk_dy_district_crop_season` (`district`, `crop_id`, `season`, `year`),
  CONSTRAINT `fk_dy_crop` FOREIGN KEY (`crop_id`) REFERENCES `crops` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `district_yields` (`district`, `province`, `crop_id`, `yield_t_ha`, `season`, `year`) VALUES
('Faisalabad', 'Punjab', 1, 3.8, 'Rabi', 2025),
('Lahore', 'Punjab', 1, 3.5, 'Rabi', 2025),
('Multan', 'Punjab', 1, 3.2, 'Rabi', 2025),
('Sahiwal', 'Punjab', 1, 3.6, 'Rabi', 2025),
('Sheikhupura', 'Punjab', 1, 3.4, 'Rabi', 2025),
('Faisalabad', 'Punjab', 2, 2.9, 'Kharif', 2025),
('Lahore', 'Punjab', 2, 2.7, 'Kharif', 2025),
('Multan', 'Punjab', 2, 2.5, 'Kharif', 2025),
('Sahiwal', 'Punjab', 2, 2.8, 'Kharif', 2025),
('Bahawalpur', 'Punjab', 2, 2.4, 'Kharif', 2025),
('Faisalabad', 'Punjab', 3, 0.8, 'Kharif', 2025),
('Multan', 'Punjab', 3, 0.7, 'Kharif', 2025),
('Bahawalpur', 'Punjab', 3, 0.65, 'Kharif', 2025),
('Rahim Yar Khan', 'Punjab', 3, 0.72, 'Kharif', 2025),
('Faisalabad', 'Punjab', 5, 4.2, 'Kharif', 2025),
('Sahiwal', 'Punjab', 5, 4.0, 'Kharif', 2025),
('Gujranwala', 'Punjab', 5, 3.9, 'Kharif', 2025)
ON DUPLICATE KEY UPDATE `yield_t_ha` = VALUES(`yield_t_ha`);

-- ---------------------------------------------------------------------------
-- contact form
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `contact_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `subject` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- rate limiting (IP + route)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rate_limits` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) NOT NULL,
  `route_key` varchar(80) NOT NULL,
  `hits` int(11) NOT NULL DEFAULT 1,
  `window_start` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rate_ip_route` (`ip_address`, `route_key`),
  KEY `idx_rate_window` (`window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Demo admin (password: Admin@123) — change after first login
INSERT INTO `users` (`name`, `email`, `password`, `role`, `region`)
SELECT 'System Admin', 'admin@agroinsight.pk',
       '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
       'admin', 'Punjab'
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'admin@agroinsight.pk');

-- ---------------------------------------------------------------------------
-- user_preferences (added for Settings page)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_preferences` (
  `id`         int(11) NOT NULL AUTO_INCREMENT,
  `user_id`    int(11) NOT NULL,
  `pref_key`   varchar(60) NOT NULL,
  `pref_value` varchar(255) NOT NULL DEFAULT '',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_pref` (`user_id`, `pref_key`),
  CONSTRAINT `fk_pref_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- economic_policies (replaces hardcoded PHP array in get_summary.php)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `economic_policies` (
  `id`         int(11) NOT NULL AUTO_INCREMENT,
  `icon`       varchar(10)  NOT NULL DEFAULT '📌',
  `title`      varchar(120) NOT NULL,
  `impact`     varchar(120) NOT NULL,
  `roi`        varchar(20)  NOT NULL,
  `sort_order` tinyint(4)   NOT NULL DEFAULT 0,
  `updated_at` timestamp    NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed data (idempotent: only inserts when table is empty)
INSERT INTO `economic_policies` (`icon`, `title`, `impact`, `roi`, `sort_order`)
SELECT * FROM (
  SELECT '💧' AS icon, 'Drip Irrigation Subsidy'      AS title, 'Rs 8.2B saved/year'          AS impact, '340%' AS roi, 1 AS sort_order
  UNION ALL
  SELECT '🛡️', 'Crop Insurance Scheme',               '1.2M families protected',              '280%', 2
  UNION ALL
  SELECT '🌱', 'Climate-Resilient Seeds',             'Rs 42B yield recovery',                '520%', 3
  UNION ALL
  SELECT '📡', 'Early Warning SMS Network',           'Rs 18B loss prevented',                '190%', 4
) AS seed
WHERE (SELECT COUNT(*) FROM `economic_policies`) = 0;
