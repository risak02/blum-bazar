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
// --- ABSOLUTNÍ IMPORT SERVEROVÝCH AKCÍ ---
import { createBazarItem, deleteBazarItem, fetchBazarItems, updateBazarItemStatus } from "@/app/[locale]/actions";
// --- UPRAVENÝ IMPORT BEZPEČNÉHO LOKÁLNÍHO AUTH KLIENTA ---
import { authClient } from "@/lib/auth-client";

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

export default function Page() {
  // Ochrana před Next.js hydration error
  const [mounted, setMounted] = useState(false);

  // Kontrola otevření oken
  const [opened, { open, close }] = useDisclosure(false);
  const [authModalOpened, { open: openAuthModal, close: closeAuthModal }] = useDisclosure(false);

  // --- STAVY PRO DATA A AKTIVNÍ RELACI Z BETTER-AUTH ---
  const { data: session, isPending } = authClient.useSession();
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
  // Stav pro e-mail ve formuláři
  const [formEmail, setFormEmail] = useState<string>("");

  // --- NAČÍTÁNÍ DAT ---
  const loadData = useCallback(async () => {
    try {
      const data = await fetchBazarItems();
      setDbItems((data || []) as unknown as BazarItem[]);
    } catch (error) {
      console.error("Chyba při načítání dat z bazaru:", error);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  // OPRAVENO: Sledování změn pro správné předvyplnění e-mailu při každém otevření
  useEffect(() => {
    if (opened) {
      if (editingItem) {
        setFormIsFree(editingItem.isFree ?? false);
        setFormPrice(editingItem.isFree ? 0 : (editingItem.price ?? 0));
        setFormEmail(editingItem.contactEmail || "");
      } else {
        setFormIsFree(false);
        setFormPrice(0);
        // Předvyplnění e-mailu z aktuální session
        setFormEmail(session?.user?.email || "");
      }
    }
  }, [opened, editingItem, session]);

  // --- AKCE PŘIHLÁŠENÍ PŘES GOOGLE ---
  const handleGoogleSignIn = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: typeof window !== "undefined" ? window.location.href : "/",
      });
    } catch (error) {
      console.error("Chyba při přihlašování přes Google:", error);
    }
  };

  // --- AKCE ODHLÁŠENÍ ---
  const handleSignOut = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.reload();
          },
        },
      });
    } catch (error) {
      console.error("Chyba při odhlašování:", error);
    }
  };

  const handleIsFreeChange = (checked: boolean) => {
    setFormIsFree(checked);
    if (checked) {
      setFormPrice(0);
    }
  };

  const handleAddOfferClick = () => {
    if (!session?.user) {
      openAuthModal();
    } else {
      open();
    }
  };

  // --- ODESLÁNÍ FORMULÁŘE ---
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session?.user) {
      openAuthModal();
      return;
    }

    const formData = new FormData(event.currentTarget);
    const selectedCategory = formData.get("category");

    if (!selectedCategory || selectedCategory.toString().trim() === "") {
      alert("Prosím, vyber kategorii nabídky.");
      return;
    }

    setLoading(true);
    formData.set("price", formIsFree ? "0" : formPrice.toString());
    formData.set("isFree", formIsFree.toString());

    // Pojistka pro disabled políčko: natvrdo vložíme e-mail ze stavu do FormData
    formData.set("contactEmail", formEmail);

    if (session?.user?.id) {
      formData.set("userId", session.user.id);
    }

    await createBazarItem(formData);

    const freshData = (await fetchBazarItems()) as unknown as BazarItem[];
    setDbItems(freshData || []);

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
    setDbItems(freshData || []);

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
    setFormEmail("");
    close();
  };

  // --- FILTROVÁNÍ ---
  const filteredItems = dbItems.filter((item) => {
    if (!item || !item.title) return false;
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

  // --- POJIŠTĚNÁ STRUKTURA VALIDACE VLASTNICTVÍ ---
  const isIdOwner =
    session?.user?.id && selectedItem?.userId && String(session.user.id).trim() === String(selectedItem.userId).trim();
  const isEmailOwner =
    session?.user?.email &&
    selectedItem?.contactEmail &&
    session.user.email.toLowerCase().trim() === selectedItem.contactEmail.toLowerCase().trim();

  const isOwner = isIdOwner || isEmailOwner;

  if (!mounted) {
    return <Box style={{ width: "100%", minHeight: "100vh" }} bg="#f8f9fa" />;
  }

  return (
    <Box style={{ width: "100%" }}>
      <Stack gap="md" style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 0" }}>
        {/* HORNÍ LIŠTA S UŽIVATELEM */}
        <Group justify="flex-end" mb="xs">
          {session?.user ? (
            <Group gap="sm">
              <Avatar src={session.user.image || undefined} alt={session.user.name} radius="xl" />
              <Text size="sm" fw={500}>
                {session.user.name}
              </Text>
              <Button
                variant="outline"
                color="gray"
                size="xs"
                radius="md"
                leftSection={<LogOut size={14} />}
                onClick={handleSignOut}
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
              onClick={openAuthModal}
              loading={isPending}
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

          <Button color="orange" size="md" radius="md" onClick={handleAddOfferClick}>
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
              if (!item) return null;
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

      {/* MODÁLNÍ OKNO PRO PŘIHLÁŠENÍ */}
      <Modal
        opened={authModalOpened}
        onClose={closeAuthModal}
        title={
          <Text fw={700} size="lg">
            Přihlášení do aplikace
          </Text>
        }
        centered
        radius="md"
        padding="xl"
      >
        <Stack gap="md" align="center" py="sm">
          <Text size="sm" c="dimmed" ta="center">
            Pro přidávání inzerátů a správu tvých nabídek se prosím přihlas pomocí Google účtu.
          </Text>

          <Button
            onClick={handleGoogleSignIn}
            size="md"
            radius="md"
            fullWidth
            color="orange"
            variant="filled"
            leftSection={<LogIn size={18} />}
          >
            Pokračovat přes Google
          </Button>
        </Stack>
      </Modal>

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

                {isOwner ? (
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
                ) : (
                  <Text size="xs" c="dimmed">
                    Pro úpravu musíte být autorem inzerátu
                  </Text>
                )}
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

                    {isOwner && (
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
                    )}
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
              key={editingItem ? `edit-${editingItem.id}` : "create"}
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
                radius="md"
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

              {/* ZASEDLÝ / ZAMČENÝ E-MAIL */}
              <TextInput label="E-mail" value={formEmail} disabled type="email" radius="md" description="" />
            </SimpleGrid>

            <Select
              label="Stav nabídky"
              name="status"
              key={editingItem ? `status-${editingItem.id}` : "status-create"}
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
