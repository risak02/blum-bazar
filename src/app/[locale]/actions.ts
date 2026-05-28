"use server"; // Definuje, že všechny funkce v tomto souboru jsou Next.js Server Actions a běží výhradně na serveru

//importy vsech veci co potrebuju na funkcnost kodu
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "../../db/index";
import * as schema from "../../db/schemas/bazar.schema";

// hledaní správné tabulky v databazy
const bazarTable =
  (schema as any).bazarItems ||
  (schema as any).bazarItem ||
  Object.values(schema).find((el: any) => el && typeof el === "object" && "id" in el);

// Vytvoření nového inzerátu nebo úprava stávajícího
export async function createBazarItem(formData: FormData) {
  const id = formData.get("id") as string | null;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;
  const category = formData.get("category") as string;
  const priceRaw = formData.get("price");
  const price = priceRaw ? Number(priceRaw.toString().replace(/\s/g, "")) : 0;

  // Kontrola, zda uživatel zaškrtnul checkbox "Nabídka je zdarma"
  const isFree = formData.get("isFree") === "true";
  const contactName = formData.get("contactName") as string;
  const contactEmail = formData.get("contactEmail") as string | null;

  // Výchozí stav inzerátu. Pokud nebyl předán, nastaví se jako "Dostupné".
  const status = (formData.get("status") as string) || "Dostupné";
  const imageUrl = formData.get("imageUrl") as string | null;

  // KLÍČOVÁ OPRAVA: Načtení ID přihlášeného uživatele z FormData, které posíláme z frontend formuláře
  const userId = formData.get("userId") as string | null;

  // Pokud se dynamickým hledáním nepodařilo tabulku v DB schématu najít, vyhodíme chybu
  if (!bazarTable) {
    throw new Error("Nepodařilo se nalézt tabulku bazaru v bazar.schema.ts");
  }

  // Zjištění názvu sloupce pro cenu v databázi
  const priceColumnName =
    "price" in bazarTable ? "price" : Object.keys(bazarTable).find((key) => key.toLowerCase().includes("price"));

  // datovy objekt v DB beze ceny a userId
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

  // PŘIŘAZENÍ CENY
  if (priceColumnName) {
    dataFields[priceColumnName] = isFree ? 0 : price;
  }

  // KLÍČOVÁ OPRAVA: Pokud vytváříme nový inzerát, přidáme userId do databázového zápisu
  if (userId) {
    dataFields.userId = userId;
  }

  // ROZHODNUTÍ MEZI ÚPRAVOU A NOVÝM ZÁZNAMEM:
  if (id && id.trim() !== "") {
    // Při úpravě stávajícího inzerátu userId raději neměníme (bezpečnostní pojistka)
    await db.update(bazarTable).set(dataFields).where(eq(bazarTable.id, id));
  } else {
    await db.insert(bazarTable).values(dataFields);
  }

  // Promazání cache pro aktuální cestu ("/")
  revalidatePath("/");
}

//Načtení všech inzerátů z databáze
export async function fetchBazarItems() {
  // Ochrana pro případ, že tabulka neexistuje
  if (!bazarTable) return [];

  const items = await db.select().from(bazarTable);

  // Pokud se sloupec v DB jmenuje jinak než 'price', namapujeme ho na 'price' pro frontend, aby se předešlo chybě 'undefined'.
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

//  Odstranění inzerátu z databáze
export async function deleteBazarItem(id: string) {
  if (!bazarTable || !id) return;
  await db.delete(bazarTable).where(eq(bazarTable.id, id));
  revalidatePath("/");
}

//  Aktualizace stavu inzerátu (Rezervováno nebo Prodáno)
export async function updateBazarItemStatus(id: string, newStatus: string) {
  if (!bazarTable || !id) return;
  await db.update(bazarTable).set({ status: newStatus }).where(eq(bazarTable.id, id));
  revalidatePath("/");
}
