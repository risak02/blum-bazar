"use client";

import {
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
import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createBazarItem, fetchBazarItems } from "./actions";

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
  const [opened, { open, close }] = useDisclosure(false);

  // --- STAVY PRO DATA Z DATABÁZE ---
  const [dbItems, setDbItems] = useState<BazarItem[]>([]);
  const [loading, setLoading] = useState(false);

  // --- STAVY PRO FILTRACI ---
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState("all");

  // Obaleno v useCallback, aby byl useEffect stoprocentně stabilní pro linter
  const loadData = useCallback(async () => {
    const data = await fetchBazarItems();
    setDbItems(data as unknown as BazarItem[]);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    await createBazarItem(formData);

    await loadData();
    setLoading(false);
    close();
  };

  // REAKTIVNÍ FILTRACE
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
      <Button
        variant="filled"
        radius="xl"
        size="sm"
        onClick={close}
        styles={{
          root: {
            backgroundColor: "#e8590c",
            "&:hover": { backgroundColor: "#d9480f" },
          },
          label: { color: "white", fontWeight: 500 },
        }}
      >
        ← Zpět
      </Button>
      <Title order={1} size="h2" fw={700}>
        Přidat nabídku
      </Title>
    </Group>
  );

  return (
    <Box bg="gray.0" style={{ minHeight: "100vh", width: "100%" }}>
      <Stack gap="md" style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        {/* Hlavička */}
        <Group justify="space-between" align="flex-start">
          <Stack gap="xs" style={{ flex: 1 }}>
            <Title order={1} size="h2" fw={700}>
              Bazar blogic store
            </Title>
            <Text c="dimmed" size="sm" style={{ maxWidth: 600 }}>
              Interní bazar Blogic Store. Nabízej věci kolegům k prodeji nebo zdarma. Platbu a předání si domluvíte
              přímo mezi sebou.
            </Text>
          </Stack>

          <Button color="orange" size="md" radius="md" onClick={open}>
            + Přidat nabídku
          </Button>
        </Group>

        {/* Filtry */}
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
                styles={{
                  root: { backgroundColor: "#f1f3f5", padding: "4px" },
                  indicator: { backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
                  label: { fontWeight: 500, paddingTop: "6px", paddingBottom: "6px", color: "#495057" },
                }}
              />
            </Box>
          </Stack>
        </Card>

        {/* Mřížka inzerátů */}
        {filteredItems.length === 0 ? (
          <Card withBorder padding="xl" radius="md" bg="white">
            <Text size="sm" c="dimmed" ta="center">
              Žádné nabídky neodpovídají vybraným filtrům.
            </Text>
          </Card>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {filteredItems.map((item) => (
              <Card key={item.id} shadow="sm" padding="lg" radius="md" withBorder bg="white">
                {item.imageUrl ? (
                  <Card.Section>
                    <Box
                      component="img"
                      src={item.imageUrl}
                      alt={item.title}
                      style={{ height: 180, width: "100%", objectFit: "cover" }}
                    />
                  </Card.Section>
                ) : null}

                <Group justify="space-between" mt="md" mb="xs">
                  <Text fw={600} size="lg" lineClamp={1}>
                    {item.title}
                  </Text>
                  <Text
                    size="xs"
                    fw={700}
                    px="xs"
                    py={2}
                    style={{
                      borderRadius: "4px",
                      backgroundColor: item.status === "Dostupné" ? "#ebfbee" : "#fff5f5",
                      color: item.status === "Dostupné" ? "#2b8a3e" : "#c92a2a",
                    }}
                  >
                    {item.status}
                  </Text>
                </Group>

                <Text size="sm" c="dimmed" lineClamp={2} style={{ minHeight: 44 }}>
                  {item.description || "Bez popisu."}
                </Text>

                <Text fw={700} size="xl" mt="md" c="orange.8">
                  {item.isFree ? "Zdarma" : `${item.price?.toLocaleString("cs-CZ")} Kč`}
                </Text>

                <Box style={{ borderTop: "1px solid #f1f3f5", paddingTop: "10px" }} mt="md">
                  <Text size="xs" c="dimmed">
                    Kontakt: <b>{item.contactName}</b>
                  </Text>
                  {item.contactEmail && (
                    <Text size="xs" c="dimmed">
                      E-mail: {item.contactEmail}
                    </Text>
                  )}
                  <Text size="xs" c="gray.5" mt={4}>
                    Kategorie: {item.category}
                  </Text>
                </Box>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>

      {/* Modal s formulářem */}
      <Modal
        opened={opened}
        onClose={close}
        title={headerLayout}
        size="xl"
        radius="md"
        padding="xl"
        withCloseButton={false}
        overlayProps={{ backgroundOpacity: 0.4, blur: 3 }}
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput label="Název věci *" name="title" placeholder="Např. Konferenční stolek" required radius="md" />

            <Textarea
              label="Popis"
              name="description"
              placeholder="Popiš stav, rozměry, místo předání..."
              minRows={3}
              autosize
              radius="md"
            />

            <Select
              label="Kategorie *"
              name="category"
              placeholder="Vyber kategorii"
              data={["ELEKTRONIKA", "DĚTSKÉ VĚCI", "KNIHY", "NÁBYTEK", "OSTATNÍ"]}
              required
              radius="md"
            />

            <Group align="flex-end">
              <NumberInput
                label="Cena"
                name="price"
                defaultValue={0}
                suffix=" Kč"
                thousandSeparator=" "
                placeholder="0 Kč"
                radius="md"
                style={{ flex: 1 }}
              />
              <Checkbox label="Nabídka je zdarma" name="isFree" value="true" mb="xs" color="orange" radius="sm" />
            </Group>

            <SimpleGrid cols={2} spacing="md">
              <TextInput label="Jméno kontaktu *" name="contactName" placeholder="Tvé jméno" required radius="md" />
              <TextInput label="E-mail" name="contactEmail" placeholder="jmeno@example.com" type="email" radius="md" />
            </SimpleGrid>

            <Select
              label="Stav nabídky"
              name="status"
              defaultValue="Dostupné"
              data={["Dostupné", "Rezervováno", "Prodáno"]}
              radius="md"
            />

            <TextInput label="URL obrázku (volitelné)" name="imageUrl" placeholder="https://..." radius="md" />

            <Group justify="flex-end" mt="xl">
              <Button type="submit" color="orange" size="md" radius="md" loading={loading}>
                Přidat nabídku
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
