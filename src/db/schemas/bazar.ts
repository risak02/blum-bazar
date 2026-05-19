import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";

export const bazarItems = pgTable("bazar_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull().default(0),
  category: text("category").notNull(),
  status: text("status").notNull().default("AVAILABLE"),
});
