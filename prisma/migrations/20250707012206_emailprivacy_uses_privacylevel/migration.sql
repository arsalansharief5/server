-- AlterTable
ALTER TABLE `users` MODIFY `emailPrivacy` ENUM('public', 'friends_only', 'private') NOT NULL DEFAULT 'friends_only';
