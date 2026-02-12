-- Database Schema for EXOT 2026
-- Import this file into your MySQL/MariaDB database

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

--
-- Table structure for table `students`
--

CREATE TABLE IF NOT EXISTS `students` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `class` varchar(50) NOT NULL,
  `type` varchar(20) DEFAULT 'siswa',
  `qr_code` varchar(100) DEFAULT NULL,
  `attended` tinyint(1) DEFAULT 0,
  `attended_at` datetime DEFAULT NULL,
  `scores` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`scores`)),
  `scored_by` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`scored_by`)),
  `created_at` timestamp DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table `users` (Panitia & Penguji)
--

CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(50) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL, -- Storing plain for now as per previous requirement, but VARCHAR 255 allows hashing later
  `name` varchar(100) NOT NULL,
  `role` varchar(20) NOT NULL, -- 'panitia', 'penguji', 'admin'
  `subject` varchar(50) DEFAULT NULL, -- For examiners
  `assigned_classes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL, -- JSON array
  `qr_code` varchar(100) DEFAULT NULL,
  `created_at` timestamp DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table `questions`
--

CREATE TABLE IF NOT EXISTS `questions` (
  `id` varchar(50) NOT NULL,
  `room` varchar(50) NOT NULL,
  `subject` varchar(20) NOT NULL, -- 'english', 'arabic', 'alquran'
  `content` text NOT NULL,
  `type` varchar(20) DEFAULT 'text', -- 'text', 'image', 'pdf'
  `target_student` varchar(50) DEFAULT NULL,
  `storage_path` varchar(255) DEFAULT NULL, -- Path to file on server if PDF/Image
  `created_at` timestamp DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table `classes`
--

CREATE TABLE IF NOT EXISTS `classes` (
  `name` varchar(50) NOT NULL,
  `created_at` timestamp DEFAULT current_timestamp(),
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table `settings`
--

CREATE TABLE IF NOT EXISTS `settings` (
  `key_name` varchar(50) NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `updated_at` timestamp DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table `activity_log`
--

CREATE TABLE IF NOT EXISTS `activity_log` (
  `id` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `user_name` varchar(100) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `timestamp` timestamp DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table `examiner_rewards`
--

CREATE TABLE IF NOT EXISTS `examiner_rewards` (
  `id` varchar(50) NOT NULL,
  `examiner_id` varchar(50) NOT NULL,
  `examiner_name` varchar(100) NOT NULL,
  `subject` varchar(50) DEFAULT NULL,
  `qr_code` varchar(50) NOT NULL,
  `generated_at` timestamp DEFAULT current_timestamp(),
  `claimed` tinyint(1) DEFAULT 0,
  `claimed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `qr_code` (`qr_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


--
-- Default Data
--

INSERT INTO `users` (`id`, `username`, `password`, `name`, `role`, `created_at`) VALUES
('admin-001', 'admin', 'exot2026', 'Super Admin', 'admin', NOW());

COMMIT;
