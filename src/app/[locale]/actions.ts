"use server";

import { desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bazarItems } from "@/db/schemas/bazar.schema";

export async function createBazarItem(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const priceString = formData.get("price") as string;
  const isFree = formData.get("isFree") === "true";
  const contactName = formData.get("contactName") as string;
  const contactEmail = formData.get("contactEmail") as string;
  const status = (formData.get("status") as string) || "Dostupné";
  const imageUrl = formData.get("imageUrl") as string;

  const price = Number.parseInt(priceString.replace(/\s/g, ""), 10) || 0;

  await db.insert(bazarItems).values({
    title,
    description: description || null,
    category,
    price,
    isFree,
    contactName,
    contactEmail: contactEmail || null,
    status,
    imageUrl: imageUrl || null,
  });

  revalidatePath("/");
}

export async function fetchBazarItems() {
  return await db.select().from(bazarItems).orderBy(desc(bazarItems.createdAt));
}
