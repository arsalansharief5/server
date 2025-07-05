-- AlterTable
ALTER TABLE `friendships` ADD COLUMN `closeFriend` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `tabPrivacy` ENUM('friends_only', 'close_friends_only', 'private') NOT NULL DEFAULT 'friends_only';
