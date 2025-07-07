-- AlterTable
ALTER TABLE `users` ADD COLUMN `lastOnlinePrivacy` ENUM('public', 'friends_only', 'private') NOT NULL DEFAULT 'friends_only',
    ADD COLUMN `onlinePrivacy` ENUM('public', 'friends_only', 'private') NOT NULL DEFAULT 'public';
