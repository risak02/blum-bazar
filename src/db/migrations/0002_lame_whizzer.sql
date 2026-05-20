CREATE TABLE `bazar_items` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`price` integer DEFAULT 0,
	`is_free` integer DEFAULT false,
	`contact_name` text NOT NULL,
	`contact_email` text,
	`status` text DEFAULT 'Dostupné',
	`image_url` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
