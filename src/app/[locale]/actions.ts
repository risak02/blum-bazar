"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Přesná cesta k indexu databáze
import { db } from "../../db/index";

// Import celého schématu
import * as schema from "../../db/schemas/bazar.schema";

// Dynamické dohledání správné tabulky
const bazarTable =
  (schema as any).bazarItems ||
  (schema as any).bazarItem ||
  Object.values(schema).find((el: any) => el && typeof el === "object" && "id" in el);

export async function createBazarItem(formData: FormData) {
  const id = formData.get("id") as string | null;

  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;
  const category = formData.get("category") as string;
  const priceRaw = formData.get("price");
  const price = priceRaw ? Number(priceRaw.toString().replace(/\s/g, "")) : 0;
  const isFree = formData.get("isFree") === "true";
  const contactName = formData.get("contactName") as string;
  const contactEmail = formData.get("contactEmail") as string | null;
  const status = (formData.get("status") as string) || "Dostupné";
  const imageUrl = formData.get("imageUrl") as string | null;

  if (!bazarTable) {
    throw new Error("Nepodařilo se nalézt tabulku bazaru v bazar.schema.ts");
  }

  // Zjistíme, jak se sloupec pro cenu skutečně jmenuje ve schématu (např. price)
  const priceColumnName =
    "price" in bazarTable ? "price" : Object.keys(bazarTable).find((key) => key.toLowerCase().includes("price"));

  const dataFields: Record<string, any> = {
    title,
    description,
    category,
    isFree,
    contactName,
    contactEmail,
    status,
    imageUrl,
  };

  // Dynamicky přiřadíme cenu správnému sloupci
  if (priceColumnName) {
    dataFields[priceColumnName] = isFree ? 0 : price;
  }

  if (id && id.trim() !== "") {
    await db.update(bazarTable).set(dataFields).where(eq(bazarTable.id, id));
  } else {
    await db.insert(bazarTable).values(dataFields);
  }

  revalidatePath("/");
}

export async function fetchBazarItems() {
  if (!bazarTable) return [];

  const items = await db.select().from(bazarTable);

  // Normalizace dat pro frontend: Pokud se sloupec v DB jmenuje jinak, namapujeme ho na jednotné 'price'
  return items.map((item: any) => {
    if (item && !("price" in item)) {
      const alternativePriceKey = Object.keys(item).find((key) => key.toLowerCase().includes("price"));
      if (alternativePriceKey) {
        item.price = item[alternativePriceKey];
      }
    }
    return item;
  });
}

export async function deleteBazarItem(id: string) {
  if (!bazarTable || !id) return;

  await db.delete(bazarTable).where(eq(bazarTable.id, id));

  revalidatePath("/");
}

export async function updateBazarItemStatus(id: string, newStatus: string) {
  if (!bazarTable || !id) return;

  await db.update(bazarTable).set({ status: newStatus }).where(eq(bazarTable.id, id));

  revalidatePath("/");
}
