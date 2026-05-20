import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const bazarItems = sqliteTable("bazar_items", {
  // SQLite neumí vestavěné UUID, generujeme ho na úrovni stringu
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // ELEKTRONIKA, KNIHY...
  price: integer("price").default(0),
  isFree: integer("is_free", { mode: "boolean" }).default(false), // SQLite nemá pravé boolean, řeší se přes integer (0/1)
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email"),
  status: text("status").default("Dostupné"), // Dostupné, Rezervováno, Prodáno
  imageUrl: text("image_url"),
  // Čas ukládáme jako text/timestamp řetězec
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});
