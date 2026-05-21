"use client";

// --- IMPORTY KNIHOVEN ---
// Importujeme vizuální komponenty z Mantine UI, které tvoří vzhled stránky (tlačítka, políčka, karty)
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
// useDisclosure je pomocná funkce od Mantine na snadné otevírání a zavírání vyskakovacích oken (Modalů)
import { useDisclosure } from "@mantine/hooks";
// Importujeme ikony (obrázek, info bublina, lupa) z balíčku lucide-react
import { ImageIcon, Info, Search } from "lucide-react";
// Importujeme základní funkce Reactu pro práci se stavy a životním cyklem komponenty
import { useCallback, useEffect, useState } from "react";
// Importujeme serverové akce (databázové operace) definované v souboru actions.ts
import { createBazarItem, deleteBazarItem, fetchBazarItems, updateBazarItemStatus } from "./actions";

// --- DATOVÝ MODEL (INTERFACE) ---
// Definujeme TypeScriptovou strukturu jednoho inzerátu, abychom věděli, jaká data u sebe každá položka nosí
interface BazarItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price: number | null;
  isFree: boolean | null;
  contactName: string;
  contactEmail: string | null;
  status: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export default function Page() {
  // Stav pro ovládání formulářového okna (opened = true/false, open = otevři, close = zavři)
  const [opened, { open, close }] = useDisclosure(false);

  // --- STAVY PRO DATA ---
  // dbItems: Zde máme uložené pole všech inzerátů načtených z databáze
  const [dbItems, setDbItems] = useState<BazarItem[]>([]);
  // loading: Hlídá, zda se právě nahrává nový nebo upravený inzerát (pro zobrazení načítacího kolečka)
  const [loading, setLoading] = useState(false);
  // deleteLoading: Hlídá, zda právě probíhá mazání inzerátu
  const [deleteLoading, setDeleteLoading] = useState(false);
  // statusLoading: Hlídá, zda se právě mění stav inzerátu (např. kliknutí na Rezervovat)
  const [statusLoading, setStatusLoading] = useState(false);

  // --- STAVY PRO FILTRACI ---
  // search: Obsahuje text, který uživatel zrovna píše do vyhledávacího pole
  const [search, setSearch] = useState("");
  // category: Obsahuje zvolenou kategorii z rozbalovacího menu (Selectu), nebo null, pokud není vybraná žádná
  const [category, setCategory] = useState<string | null>(null);
  // status: Obsahuje zvolený stav z rozbalovacího menu (Dostupné, Rezervováno, Prodáno)
  const [status, setStatus] = useState<string | null>(null);
  // priceFilter: Hlídá přepínač ceny ("all" = vše, "free" = zdarma, "paid" = placené)
  const [priceFilter, setPriceFilter] = useState("all");

  // --- DETAIL A HOVER STAVY ---
  // selectedItem: Pamatuje si inzerát, na který uživatel kliknul, a otevírá jeho detail přes celou obrazovku
  const [selectedItem, setSelectedItem] = useState<BazarItem | null>(null);
  // hoveredCardId: Pamatuje si ID inzerátu, nad kterým uživatel zrovna drží kurzor myši (pro efekt nadzvednutí karty)
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  // editingItem: Pokud upravujeme existující inzerát, sem si uložíme jeho data, abychom věděli, že jsme v režimu editace
  const [editingItem, setEditingItem] = useState<BazarItem | null>(null);

  // --- STAVY PRO FORMULÁŘ (CENA A ZDARMA) ---
  // formPrice: Drží aktuální hodnotu ceny zapsanou ve formuláři
  const [formPrice, setFormPrice] = useState<string | number>(0);
  // formIsFree: Drží informaci o tom, zda je ve formuláři zaškrtnutý checkbox "Nabídka je zdarma"
  const [formIsFree, setFormIsFree] = useState<boolean>(false);

  // --- NAČÍTÁNÍ DAT ---
  // Funkce, která asynchronně zavolá serverovou akci, stáhne inzeráty a uloží je do stavu dbItems
  const loadData = useCallback(async () => {
    const data = await fetchBazarItems();
    setDbItems(data as unknown as BazarItem[]);
  }, []);

  // Tento efekt se spustí automaticky hned při prvním vykreslení stránky a načte data
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tento efekt sleduje, zda se neotevřel inzerát k úpravě. Pokud ano, předvyplní do formuláře jeho cenu a stav zdarma.
  // Pokud otevíráme prázdný formulář, nastaví výchozí hodnoty (0 Kč, nezaškrtnuto).
  useEffect(() => {
    if (editingItem) {
      setFormIsFree(editingItem.isFree ?? false);
      setFormPrice(editingItem.isFree ? 0 : (editingItem.price ?? 0));
    } else {
      setFormIsFree(false);
      setFormPrice(0);
    }
  }, [editingItem]);

  // Funkce reagující na zaškrtnutí "Nabídka je zdarma" — pokud se zaškrtne, automaticky vynutí cenu 0 Kč
  const handleIsFreeChange = (checked: boolean) => {
    setFormIsFree(checked);
    if (checked) {
      setFormPrice(0);
    }
  };

  // --- ODESLÁNÍ FORMULÁŘE (Vytvoření / Úprava) ---
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Zamezíme klasickému obnovení stránky prohlížečem

    const formData = new FormData(event.currentTarget); // Posbíráme data z formulářových políček
    const selectedCategory = formData.get("category");

    // Validace: Pokud uživatel zapomněl vybrat kategorii, upozorníme ho a zastavíme odesílání
    if (!selectedCategory || selectedCategory.toString().trim() === "") {
      alert("Prosím, vyber kategorii nabídky.");
      return;
    }

    setLoading(true); // Spustíme načítací indikátor na tlačítku
    // Ručně do formData dosadíme upravené hodnoty pro cenu a příznak "zdarma"
    formData.set("price", formIsFree ? "0" : formPrice.toString());
    formData.set("isFree", formIsFree.toString());

    // Zavoláme serverovou akci pro uložení/aktualizaci inzerátu v databázi
    await createBazarItem(formData);

    // Po úspěšném uložení stáhneme z databáze čerstvá, aktualizovaná data
    const freshData = (await fetchBazarItems()) as unknown as BazarItem[];
    setDbItems(freshData);

    // Pokud jsme upravovali inzerát, který byl zrovna otevřený v detailu, aktualizujeme data i v tomto otevřeném detailu
    if (editingItem) {
      const updated = freshData.find((i) => (i as BazarItem).id === editingItem.id) as BazarItem | undefined;
      if (updated) setSelectedItem(updated);
    }

    setLoading(false); // Vypneme načítací indikátor
    handleCloseForm(); // Vyčistíme a zavřeme formulářové okno
  };

  // --- SMAZÁNÍ INZERÁTU ---
  const handleDeleteClick = async (id: string) => {
    // Zobrazíme nativní potvrzovací dialog prohlížeče
    if (confirm("Opravdu chceš tento inzerát trvale smazat?")) {
      setDeleteLoading(true);
      await deleteBazarItem(id); // Zavoláme smazání na serveru
      setSelectedItem(null); // Zavřeme detail smazaného inzerátu
      await loadData(); // Znovu načteme seznam inzerátů
      setDeleteLoading(false);
    }
  };

  // --- ZMĚNA STAVU (Rezervace / Prodej) ---
  const handleStatusChange = async (id: string, newStatus: string) => {
    setStatusLoading(true);
    await updateBazarItemStatus(id, newStatus); // Aktualizujeme stav na serveru

    // Znovu načteme data, abychom měli aktuální seznam
    const freshData = (await fetchBazarItems()) as unknown as BazarItem[];
    setDbItems(freshData);

    // Aktualizujeme data v detailu inzerátu, aby uživatel hned viděl nový odznak (např. REZERVOVÁNO)
    const updated = freshData.find((i) => (i as BazarItem).id === id) as BazarItem | undefined;
    if (updated) setSelectedItem(updated);

    setStatusLoading(false);
  };

  // Funkce, která se spustí při kliknutí na "Upravit inzerát" — přepne okno do režimu úprav a otevře ho
  const handleEditClick = (item: BazarItem) => {
    setEditingItem(item);
    open();
  };

  // Funkce pro bezpečné zavření formuláře, která vyčistí dočasné stavy, aby při příštím otevření byl formulář čistý
  const handleCloseForm = () => {
    setEditingItem(null);
    setFormPrice(0);
    setFormIsFree(false);
    close();
  };

  // --- ŽIVÉ FILTROVÁNÍ INZERÁTŮ ---
  // Tato proměnná bere pole dbItems a bleskově ho filtruje přímo v prohlížeči podle zadaných kritérií
  const filteredItems = dbItems.filter((item) => {
    // Filtrování textem: Hledá shodu v názvu nebo popisu (převádí text na malá písmena, aby nezáleželo na velikosti)
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.description?.toLowerCase() || "").includes(search.toLowerCase());

    // Filtrování podle vybrané kategorie (pokud není vybraná, projde vše)
    const matchesCategory = !category || item.category === category;
    // Filtrování podle vybraného stavu (Dostupné / Rezervováno / Prodáno)
    const matchesStatus = !status || item.status === status;

    // Filtrování podle ceny (Vše / Zdarma / Placené)
    let matchesPrice = true;
    if (priceFilter === "free") matchesPrice = item.isFree === true || item.price === 0;
    if (priceFilter === "paid") matchesPrice = !item.isFree && (item.price || 0) > 0;

    // Položka projde filtrem pouze tehdy, pokud splňuje úplně všechny podmínky najednou
    return matchesSearch && matchesCategory && matchesStatus && matchesPrice;
  });

  // Pomocný kus rozhraní pro nadpis modálního okna (mění text dynamicky podle toho, zda přidáváme nebo upravujeme)
  const headerLayout = (
    <Group gap="md" mb="xs" align="center">
      <Button variant="filled" radius="xl" size="sm" onClick={handleCloseForm} color="orange">
        ← Zpět
      </Button>
      <Title order={1} size="h2" fw={700}>
        {editingItem ? "Upravit nabídku" : "Přidat nabídku"}
      </Title>
    </Group>
  );

  return (
    // Hlavní obalovací box stránky
    <Box style={{ width: "100%" }}>
      {/* Vertikální sloupec (Stack), který centruje obsah na střed obrazovky do maximální šířky 1200px */}
      <Stack gap="md" style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 0" }}>
        {/* HLAVNÍ NADPIS A TLAČÍTKO PRO PŘIDÁNÍ */}
        <Group justify="space-between" align="flex-start">
          <Stack gap="xs" style={{ flex: 1 }}>
            <Title order={1} size="h2" fw={700}>
              Bazar blogic store
            </Title>
            <Text c="dimmed" size="sm" style={{ maxWidth: 600 }}>
              Interní bazar Blogic Store. Nabízej věci kolegům k prodeji nebo zdarma.
            </Text>
          </Stack>

          <Button color="orange" size="md" radius="md" onClick={open}>
            + Přidat nabídku
          </Button>
        </Group>

        {/* BOX S FILTRY */}
        <Card withBorder padding="md" radius="md" bg="white">
          <Stack gap="md">
            {/* Responzivní mřížka (SimpleGrid) — na mobilu 1 sloupec, od šířky 'sm' výš 3 sloupce vedle sebe */}
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              {/* Vyhledávací textové pole spojené se stavem 'search' */}
              <TextInput
                placeholder="Hledat nabídku..."
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                radius="md"
                leftSection={<Search size={16} strokeWidth={1.5} color="#adb5bd" />}
              />

              {/* Výběr kategorie spojený se stavem 'category' */}
              <Select
                placeholder="Kategorie"
                value={category}
                onChange={setCategory}
                data={["ELEKTRONIKA", "DĚTSKÉ VĚCI", "KNIHY", "NÁBYTEK", "OSTATNÍ"]}
                clearable
                radius="md"
              />

              {/* Výběr stavu inzerátu spojený se stavem 'status' */}
              <Select
                placeholder="Stav"
                value={status}
                onChange={setStatus}
                data={["Dostupné", "Rezervováno", "Prodáno"]}
                clearable
                radius="md"
              />
            </SimpleGrid>

            {/* Přepínač Vše / Zdarma / Placené spojený se stavem 'priceFilter' */}
            <Box style={{ width: "100%" }}>
              <SegmentedControl
                value={priceFilter}
                onChange={setPriceFilter}
                radius="md"
                size="md"
                fullWidth
                data={[
                  { label: "Vše", value: "all" },
                  { label: "Zdarma", value: "free" },
                  { label: "Placené", value: "paid" },
                ]}
              />
            </Box>
          </Stack>
        </Card>

        {/* VÝPIS INZERÁTŮ (Mřížka karet) */}
        {/* Podmínka: Pokud po vyfiltrování nezbyl žádný inzerát, zobrazíme text, že nic nebylo nalezeno */}
        {filteredItems.length === 0 ? (
          <Card withBorder padding="xl" radius="md" bg="white">
            <Text size="sm" c="dimmed" ta="center">
              Žádné nabídky neodpovídají vybraným filtrům.
            </Text>
          </Card>
        ) : (
          // Pokud inzeráty máme, vykreslíme mřížku (1 sloupec na mobilu, 2 na tabletu, 3 na monitoru)
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {filteredItems.map((item) => {
              // Zjišťujeme, zda myš stojí zrovna nad touto konkrétní kartou
              const isHovered = hoveredCardId === item.id;

              // Dynamická volba barvy odznaku podle stavu inzerátu
              let badgeColor = "green";
              if (item.status === "Rezervováno") badgeColor = "orange";
              if (item.status === "Prodáno") badgeColor = "red";

              return (
                <Card
                  key={item.id}
                  shadow={isHovered ? "md" : "sm"}
                  padding="lg"
                  radius="md"
                  withBorder
                  bg="white"
                  // Hlídání pohybu myši pro aktivaci hover efektu (nadzvednutí karty o 5px)
                  onMouseEnter={() => setHoveredCardId(item.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  // Kliknutím na kartu ji uložíme do selectedItem, čímž se otevře její velký detail
                  onClick={() => setSelectedItem(item)}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    cursor: "pointer",
                    transform: isHovered ? "translateY(-5px)" : "translateY(0)",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease", // Plynulá animace pohybu
                  }}
                >
                  {/* Obrázek inzerátu (pokud u sebe položka má uloženou URL adresu) */}
                  {item.imageUrl && (
                    <Card.Section style={{ position: "relative", overflow: "hidden" }}>
                      <Box
                        component="img"
                        src={item.imageUrl}
                        alt={item.title}
                        style={{ height: 180, width: "100%", objectFit: "cover" }}
                      />
                    </Card.Section>
                  )}

                  {/* Název inzerátu a Barevný stavový odznak */}
                  <Group justify="space-between" mt="md" mb="xs">
                    <Text fw={600} size="lg" lineClamp={1}>
                      {item.title}
                    </Text>
                    <Badge color={badgeColor} variant="light">
                      {item.status || "Dostupné"}
                    </Badge>
                  </Group>

                  {/* Krátký popis zkrácený maximálně na 2 řádky (lineClamp={2}) */}
                  <Text size="sm" c="dimmed" lineClamp={2} style={{ minHeight: 44 }}>
                    {item.description || "Bez popisu."}
                  </Text>

                  {/* Formátovaná cena inzerátu (převádí např. 5500 na "5 500 Kč") */}
                  <Text fw={700} size="xl" mt="md" c="orange.8">
                    {item.isFree ? "Zdarma" : `${(item.price ?? 0).toLocaleString("cs-CZ")} Kč`}
                  </Text>
                </Card>
              );
            })}
          </SimpleGrid>
        )}
      </Stack>

      {/* --- MODÁLNÍ OKNO DETAILU INZERÁTU --- */}
      {/* Otevře se přes celou obrazovku (fullScreen), pokud stav selectedItem není null */}
      <Modal
        opened={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        fullScreen
        withCloseButton={false}
        styles={{
          body: { padding: 0, backgroundColor: "#f8f9fa", minHeight: "100vh" },
        }}
      >
        {selectedItem && (
          <Box>
            {/* Horní bílá lišta s ovládacími tlačítky detailu */}
            <Box bg="white" style={{ borderBottom: "1px solid #e9ecef" }} px="md" py="sm">
              <Group justify="space-between" style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
                <Button variant="filled" color="orange" radius="xl" size="sm" onClick={() => setSelectedItem(null)}>
                  ← Zpět na seznam
                </Button>

                {/* Tlačítka pro úpravu a smazání inzerátu */}
                <Group gap="xs">
                  <Button
                    variant="filled"
                    color="orange"
                    radius="xl"
                    size="sm"
                    onClick={() => handleEditClick(selectedItem)}
                  >
                    ✏️ Upravit inzerát
                  </Button>

                  <Button
                    variant="filled"
                    color="red"
                    radius="xl"
                    size="sm"
                    loading={deleteLoading}
                    onClick={() => handleDeleteClick(selectedItem.id)}
                  >
                    🗑️ Smazat inzerát
                  </Button>
                </Group>
              </Group>
            </Box>

            {/* Vnitřní obsah detailu rozdělený na dva sloupce (vlevo foto, vpravo texty) */}
            <Box style={{ maxWidth: 1200, margin: "40px auto", padding: "0 24px" }}>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                {/* LEVÝ SLOUPEC: OBRÁZEK */}
                <Card
                  withBorder
                  radius="md"
                  p={0}
                  bg="white"
                  style={{ minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  {selectedItem.imageUrl ? (
                    <Box
                      component="img"
                      src={selectedItem.imageUrl}
                      alt={selectedItem.title}
                      style={{ width: "100%", height: "100%", maxHeight: 500, objectFit: "contain" }}
                    />
                  ) : (
                    // Náhradní zobrazení (ikonka), pokud inzerát nemá žádný obrázek
                    <Stack align="center" gap="xs" c="dimmed">
                      <ImageIcon size={48} strokeWidth={1} />
                      <Text size="sm">Obrázek není k dispozici</Text>
                    </Stack>
                  )}
                </Card>

                {/* PRAVÝ SLOUPEC: INFORMACE O PRODUKTU */}
                <Card withBorder radius="md" padding="xl" bg="white">
                  <Stack gap="lg">
                    {/* Název a stavový odznak */}
                    <Group justify="space-between" align="flex-start">
                      <Title order={2} size="h1" fw={700}>
                        {selectedItem.title}
                      </Title>

                      <Badge
                        color={
                          selectedItem.status === "Dostupné"
                            ? "green"
                            : selectedItem.status === "Rezervováno"
                              ? "orange"
                              : "red"
                        }
                        size="lg"
                      >
                        {selectedItem.status?.toUpperCase() || "DOSTUPNÉ"}
                      </Badge>
                    </Group>

                    {/* Odznaky pro kategorii a cenu */}
                    <Group gap="xs">
                      <Badge color="orange" variant="outline">
                        {selectedItem.category}
                      </Badge>
                      <Badge color="green">
                        {selectedItem.isFree ? "ZDARMA" : `${(selectedItem.price ?? 0).toLocaleString("cs-CZ")} Kč`}
                      </Badge>
                    </Group>

                    {/* Dlouhý popis inzerátu */}
                    <Text size="md" style={{ lineHeight: 1.6 }}>
                      {selectedItem.description || "Tento inzerát nemá žádný bližší popis."}
                    </Text>

                    {/* Kontaktní údaje prodejce */}
                    <Box style={{ borderTop: "1px solid #dee2e6", paddingTop: "16px" }}>
                      <Text fw={700} size="sm" mb="xs">
                        Kontakt
                      </Text>
                      <Text size="sm" fw={500}>
                        {selectedItem.contactName}
                      </Text>
                      {selectedItem.contactEmail && (
                        <Text size="sm" c="dimmed">
                          {selectedItem.contactEmail}
                        </Text>
                      )}
                    </Box>

                    {/* Statické upozornění o platbě */}
                    <Alert variant="light" color="orange" title="Platba a předání" icon={<Info size={16} />}>
                      Platbu a předání si domluvte přímo mezi sebou — hotově nebo QR platbou.
                    </Alert>

                    {/* AKČNÍ TLAČÍTKA PRO RYCHLOU ZMĚNU STAVU (Rezervace / Vrácení do prodeje) */}
                    <Group gap="md" mt="xl">
                      {selectedItem.status === "Rezervováno" ? (
                        <Button
                          variant="outline"
                          color="orange"
                          size="md"
                          radius="md"
                          style={{ flex: 1 }}
                          loading={statusLoading}
                          onClick={() => handleStatusChange(selectedItem.id, "Dostupné")}
                        >
                          Zrušit rezervaci
                        </Button>
                      ) : (
                        <Button
                          color="orange"
                          size="md"
                          radius="md"
                          style={{ flex: 1 }}
                          loading={statusLoading}
                          disabled={selectedItem.status === "Prodáno"} // Pokud je prodáno, nelze rezervovat
                          onClick={() => handleStatusChange(selectedItem.id, "Rezervováno")}
                        >
                          Rezervovat
                        </Button>
                      )}

                      {selectedItem.status === "Prodáno" ? (
                        <Button
                          variant="outline"
                          color="gray"
                          size="md"
                          radius="md"
                          style={{ flex: 1 }}
                          loading={statusLoading}
                          onClick={() => handleStatusChange(selectedItem.id, "Dostupné")}
                        >
                          Vrátit do prodeje
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          color="red"
                          size="md"
                          radius="md"
                          style={{ flex: 1 }}
                          loading={statusLoading}
                          onClick={() => handleStatusChange(selectedItem.id, "Prodáno")}
                        >
                          Označit jako prodáno
                        </Button>
                      )}
                    </Group>
                  </Stack>
                </Card>
              </SimpleGrid>
            </Box>
          </Box>
        )}
      </Modal>

      {/* --- MODÁLNÍ OKNO FORMULÁŘE (Přidání / Úprava) --- */}
      <Modal
        opened={opened}
        onClose={handleCloseForm}
        title={headerLayout}
        size="xl"
        radius="md"
        padding="xl"
        withCloseButton={false}
      >
        {/* Formulář propojený s funkcí handleSubmit */}
        <form onSubmit={handleSubmit}>
          {/* Skryté pole (hidden input), které posílá ID inzerátu pouze tehdy, když zrovna upravujeme existující položku */}
          {editingItem && <input type="hidden" name="id" value={editingItem.id} />}

          <Stack gap="md">
            {/* Políčko pro Název věci */}
            <TextInput
              label="Název věci"
              name="title"
              defaultValue={editingItem?.title || ""}
              required
              withAsterisk
              radius="md"
            />

            {/* Políčko pro Popis */}
            <Textarea
              label="Popis"
              name="description"
              defaultValue={editingItem?.description || ""}
              minRows={3}
              radius="md"
            />

            {/* Rozbalovací menu pro Výběr kategorie */}
            <Select
              label="Kategorie"
              name="category"
              defaultValue={editingItem?.category || null}
              data={["ELEKTRONIKA", "DĚTSKÉ VĚCI", "KNIHY", "NÁBYTEK", "OSTATNÍ"]}
              required
              withAsterisk
              allowDeselect={false}
              radius="md"
            />

            {/* Skupina pro Cenu a zaškrtávací políčko Zdarma */}
            <Group align="flex-end">
              <NumberInput
                label="Cena"
                value={formPrice}
                onChange={(val) => setFormPrice(val || 0)}
                disabled={formIsFree} // Pokud je zaškrtnuto zdarma, políčko zešedne a nelze do něj psát
                suffix=" Kč"
                thousandSeparator=" "
                radius="md"
                style={{ flex: 1 }}
              />
              <Checkbox
                label="Nabídka je zdarma"
                checked={formIsFree}
                onChange={(event) => handleIsFreeChange(event.currentTarget.checked)}
                mb="xs"
                color="orange"
              />
            </Group>

            {/* Kontaktní údaje (Jméno a E-mail) poskládané do dvou sloupců */}
            <SimpleGrid cols={2} spacing="md">
              <TextInput
                label="Jméno kontaktu"
                name="contactName"
                defaultValue={editingItem?.contactName || ""}
                required
                withAsterisk
                radius="md"
              />
              <TextInput
                label="E-mail"
                name="contactEmail"
                defaultValue={editingItem?.contactEmail || ""}
                type="email"
                radius="md"
              />
            </SimpleGrid>

            {/* Nastavení výchozího stavu nabídky při vytváření/úpravě */}
            <Select
              label="Stav nabídky"
              name="status"
              defaultValue={editingItem?.status || "Dostupné"}
              data={["Dostupné", "Rezervováno", "Prodáno"]}
              radius="md"
            />

            {/* Nepovinné políčko pro vložení odkazu na webový obrázek */}
            <TextInput
              label="URL obrázku (volitelné)"
              name="imageUrl"
              defaultValue={editingItem?.imageUrl || ""}
              radius="md"
            />

            {/* Odesílací tlačítko, které při ukládání (loading=true) ukáže animaci načítání */}
            <Group justify="flex-end" mt="xl">
              <Button type="submit" color="orange" size="md" radius="md" loading={loading}>
                {editingItem ? "Uložit změny" : "Přidat nabídku"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
