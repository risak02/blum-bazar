"use client";

// --- IMPORTY KNIHOVEN ---
import {
  Alert,
  Avatar,
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
import { useDisclosure } from "@mantine/hooks";
import { ImageIcon, Info, LogIn, LogOut, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// --- ABSOLUTNÍ IMPORT SERVEROVÝCH AKCÍ (BEZ AUTH IMPORTŮ) ---
import { createBazarItem, deleteBazarItem, fetchBazarItems, updateBazarItemStatus } from "@/app/[locale]/actions";

// --- DATOVÝ MODEL (INTERFACE) ---
interface BazarItem {
  id: string;
  userId: string;
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

// Struktura uživatele pro čistý stav bez knihovny
interface MockUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export default function Page() {
  const [opened, { open, close }] = useDisclosure(false);

  // --- STAVY PRO UŽIVATELE A DATA ---
  const [sessionUser, setSessionUser] = useState<MockUser | null>(null);
  const [dbItems, setDbItems] = useState<BazarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // --- STAVY PRO FILTRACI ---
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState("all");

  // --- DETAIL A HOVER STAVY ---
  const [selectedItem, setSelectedItem] = useState<BazarItem | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<BazarItem | null>(null);

  // --- STAVY PRO FORMULÁŘ ---
  const [formPrice, setFormPrice] = useState<string | number>(0);
  const [formIsFree, setFormIsFree] = useState<boolean>(false);

  // --- NAČÍTÁNÍ SEZNAMU A UŽIVATELE ZE SERVERU ---
  const loadData = useCallback(async () => {
    try {
      const data = await fetchBazarItems();
      setDbItems(data as unknown as BazarItem[]);

      // Pro simulaci přihlášení, pokud nemáme klienta na frontendu:
      // Po načtení položek se podíváme, zda existuje inzerát, abychom z něj vzali userId
      // pro účely testování zobrazení tlačítek "Upravit/Smazat".
      if (data && data.length > 0) {
        const firstItem = data[0] as unknown as BazarItem;
        setSessionUser({
          id: firstItem.userId, // Nastaví tě jako vlastníka pro testování
          name: firstItem.contactName || "Přihlášený Uživatel",
          email: firstItem.contactEmail || "user@blogic.cz",
        });
      }
    } catch (error) {
      console.error("Chyba při načítání dat z bazaru:", error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (editingItem) {
      setFormIsFree(editingItem.isFree ?? false);
      setFormPrice(editingItem.isFree ? 0 : (editingItem.price ?? 0));
    } else {
      setFormIsFree(false);
      setFormPrice(0);
    }
  }, [editingItem]);

  const handleIsFreeChange = (checked: boolean) => {
    setFormIsFree(checked);
    if (checked) {
      setFormPrice(0);
    }
  };

  // --- ODESLÁNÍ FORMULÁŘE ---
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const selectedCategory = formData.get("category");

    if (!selectedCategory || selectedCategory.toString().trim() === "") {
      alert("Prosím, vyber kategorii nabídky.");
      return;
    }

    setLoading(true);
    formData.set("price", formIsFree ? "0" : formPrice.toString());
    formData.set("isFree", formIsFree.toString());

    await createBazarItem(formData);

    const freshData = (await fetchBazarItems()) as unknown as BazarItem[];
    setDbItems(freshData);

    if (editingItem) {
      const updated = freshData.find((i) => (i as BazarItem).id === editingItem.id) as BazarItem | undefined;
      if (updated) setSelectedItem(updated);
    }

    setLoading(false);
    handleCloseForm();
  };

  // --- SMAZÁNÍ INZERÁTU ---
  const handleDeleteClick = async (id: string) => {
    if (confirm("Opravdu chceš tento inzerát trvale smazat?")) {
      setDeleteLoading(true);
      await deleteBazarItem(id);
      setSelectedItem(null);
      await loadData();
      setDeleteLoading(false);
    }
  };

  // --- ZMĚNA STAVU ---
  const handleStatusChange = async (id: string, newStatus: string) => {
    setStatusLoading(true);
    await updateBazarItemStatus(id, newStatus);

    const freshData = (await fetchBazarItems()) as unknown as BazarItem[];
    setDbItems(freshData);

    const updated = freshData.find((i) => (i as BazarItem).id === id) as BazarItem | undefined;
    if (updated) setSelectedItem(updated);

    setStatusLoading(false);
  };

  const handleEditClick = (item: BazarItem) => {
    setEditingItem(item);
    open();
  };

  const handleCloseForm = () => {
    setEditingItem(null);
    setFormPrice(0);
    setFormIsFree(false);
    close();
  };

  // --- FILTROVÁNÍ ---
  const filteredItems = dbItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.description?.toLowerCase() || "").includes(search.toLowerCase());

    const matchesCategory = !category || item.category === category;
    const matchesStatus = !status || item.status === status;

    let matchesPrice = true;
    if (priceFilter === "free") matchesPrice = item.isFree === true || item.price === 0;
    if (priceFilter === "paid") matchesPrice = !item.isFree && (item.price || 0) > 0;

    return matchesSearch && matchesCategory && matchesStatus && matchesPrice;
  });

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

  // Bezpečné ověření vlastnictví na základě ID
  const isOwner = sessionUser && selectedItem && sessionUser.id === selectedItem.userId;

  return (
    <Box style={{ width: "100%" }}>
      <Stack gap="md" style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 0" }}>
        {/* HORNÍ LIŠTA S AUTENTIZACÍ (BEZ KNIHOVNY) */}
        <Group justify="flex-end" mb="xs">
          {sessionUser ? (
            <Group gap="sm">
              <Avatar src={sessionUser.image || undefined} alt={sessionUser.name} radius="xl" />
              <Text size="sm" fw={500}>
                {sessionUser.name}
              </Text>
              <Button
                variant="outline"
                color="gray"
                size="xs"
                radius="md"
                leftSection={<LogOut size={14} />}
                onClick={() => setSessionUser(null)}
              >
                Odhlásit se
              </Button>
            </Group>
          ) : (
            <Button
              color="orange"
              variant="outline"
              size="sm"
              radius="md"
              leftSection={<LogIn size={16} />}
              onClick={() => {
                // Přímé nastavení lokálního mock stavu pro bypass přihlášení
                setSessionUser({ id: "user-123", name: "Blogic Kolega", email: "kolega@blogic.cz" });
              }}
            >
              Přihlásit se
            </Button>
          )}
        </Group>

        {/* HLAVNÍ NADPIS */}
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

        {/* FILTRY */}
        <Card withBorder padding="md" radius="md" bg="white">
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <TextInput
                placeholder="Hledat nabídku..."
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                radius="md"
                leftSection={<Search size={16} strokeWidth={1.5} color="#adb5bd" />}
              />

              <Select
                placeholder="Kategorie"
                value={category}
                onChange={setCategory}
                data={["ELEKTRONIKA", "DĚTSKÉ VĚCI", "KNIHY", "NÁBYTEK", "OSTATNÍ"]}
                clearable
                radius="md"
              />

              <Select
                placeholder="Stav"
                value={status}
                onChange={setStatus}
                data={["Dostupné", "Rezervováno", "Prodáno"]}
                clearable
                radius="md"
              />
            </SimpleGrid>

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

        {/* VÝPIS POLOŽEK */}
        {filteredItems.length === 0 ? (
          <Card withBorder padding="xl" radius="md" bg="white">
            <Text size="sm" c="dimmed" ta="center">
              Žádné nabídky neodpovídají vybraným filtrům.
            </Text>
          </Card>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {filteredItems.map((item) => {
              const isHovered = hoveredCardId === item.id;
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
                  onMouseEnter={() => setHoveredCardId(item.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    cursor: "pointer",
                    transform: isHovered ? "translateY(-5px)" : "translateY(0)",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                >
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

                  <Group justify="space-between" mt="md" mb="xs">
                    <Text fw={600} size="lg" lineClamp={1}>
                      {item.title}
                    </Text>
                    <Badge color={badgeColor} variant="light">
                      {item.status || "Dostupné"}
                    </Badge>
                  </Group>

                  <Text size="sm" c="dimmed" lineClamp={2} style={{ minHeight: 44 }}>
                    {item.description || "Bez popisu."}
                  </Text>

                  <Text fw={700} size="xl" mt="md" c="orange.8">
                    {item.isFree ? "Zdarma" : `${(item.price ?? 0).toLocaleString("cs-CZ")} Kč`}
                  </Text>
                </Card>
              );
            })}
          </SimpleGrid>
        )}
      </Stack>

      {/* MODÁL DETAILU INZERÁTU */}
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
            <Box bg="white" style={{ borderBottom: "1px solid #e9ecef" }} px="md" py="sm">
              <Group justify="space-between" style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
                <Button variant="filled" color="orange" radius="xl" size="sm" onClick={() => setSelectedItem(null)}>
                  ← Zpět na seznam
                </Button>

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

            <Box style={{ maxWidth: 1200, margin: "40px auto", padding: "0 24px" }}>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
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
                    <Stack align="center" gap="xs" c="dimmed">
                      <ImageIcon size={48} strokeWidth={1} />
                      <Text size="sm">Obrázek není k dispozici</Text>
                    </Stack>
                  )}
                </Card>

                <Card withBorder radius="md" padding="xl" bg="white">
                  <Stack gap="lg">
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

                    <Group gap="xs">
                      <Badge color="orange" variant="outline">
                        {selectedItem.category}
                      </Badge>
                      <Badge color="green">
                        {selectedItem.isFree ? "ZDARMA" : `${(selectedItem.price ?? 0).toLocaleString("cs-CZ")} Kč`}
                      </Badge>
                    </Group>

                    <Text size="md" style={{ lineHeight: 1.6 }}>
                      {selectedItem.description || "Tento inzerát nemá žádný bližší popis."}
                    </Text>

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

                    <Alert variant="light" color="orange" title="Platba a předání" icon={<Info size={16} />}>
                      Platbu a předání si domluvte přímo mezi sebou.
                    </Alert>

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
                          disabled={selectedItem.status === "Prodáno"}
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

      {/* MODÁL FORMULÁŘE PRO PŘIDÁNÍ/ÚPRAVU */}
      <Modal
        opened={opened}
        onClose={handleCloseForm}
        title={headerLayout}
        size="xl"
        radius="md"
        padding="xl"
        withCloseButton={false}
      >
        <form onSubmit={handleSubmit}>
          {editingItem && <input type="hidden" name="id" value={editingItem.id} />}

          <Stack gap="md">
            <TextInput
              label="Název věci"
              name="title"
              defaultValue={editingItem?.title || ""}
              required
              withAsterisk
              radius="md"
            />

            <Textarea
              label="Popis"
              name="description"
              defaultValue={editingItem?.description || ""}
              minRows={3}
              radius="md"
            />

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

            <Group align="flex-end">
              <NumberInput
                label="Cena"
                value={formPrice}
                onChange={(val) => setFormPrice(val || 0)}
                disabled={formIsFree}
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

            <Select
              label="Stav nabídky"
              name="status"
              defaultValue={editingItem?.status || "Dostupné"}
              data={["Dostupné", "Rezervováno", "Prodáno"]}
              radius="md"
            />

            <TextInput
              label="URL obrázku (volitelné)"
              name="imageUrl"
              defaultValue={editingItem?.imageUrl || ""}
              radius="md"
            />

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
