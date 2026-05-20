import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const bazarItems = pgTable("bazar_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // ELEKTRONIKA, KNIHY...
  price: integer("price").default(0),
  isFree: boolean("is_free").default(false),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email"),
  status: text("status").default("Dostupné"), // Dostupné, Rezervováno, Prodáno
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
