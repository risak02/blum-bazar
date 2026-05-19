"use client"; // Důležité pro interaktivní filtry, přepínače a Modal

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
import { Search } from "lucide-react"; // Ikonka lupy do vyhledávače
import { useState } from "react";

export default function Page() {
  // Hook z Mantine pro otevírání a zavírání vyskakovacího okna
  const [opened, { open, close }] = useDisclosure(false);

  // --- STAVY PRO FILTRACI ---
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState("all"); // Vše / Zdarma / Placené

  // --- Horní lišta uvnitř okna (ORANŽOVÁ BUBLINA ZPĚT NALEVO S BÍLÝM PÍSMEM) ---
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
            "&:hover": {
              backgroundColor: "#d9480f",
            },
          },
          label: {
            color: "white",
            fontWeight: 500,
          },
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
        {/* --- Hlavní hlavička webu --- */}
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

        {/* --- FILTRACE BEZ PŘEKRÝVÁNÍ TEXTŮ --- */}
        <Card withBorder padding="md" radius="md" bg="white">
          <Stack gap="md">
            {/* První řádek: Hledat, Kategorie, Stav */}
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              {/* Vyhledávání s lupou */}
              <TextInput
                placeholder="Hledat nabídku..."
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                radius="md"
                leftSection={<Search size={16} strokeWidth={1.5} color="#adb5bd" />}
              />

              {/* Filtr podle kategorií */}
              <Select
                placeholder="Kategorie"
                value={category}
                onChange={setCategory}
                data={["ELEKTRONIKA", "DĚTSKÉ VĚCI", "KNIHY", "NÁBYTEK", "OSTATNÍ"]}
                clearable
                radius="md"
              />

              {/* Filtr podle stavu */}
              <Select
                placeholder="Stav"
                value={status}
                onChange={setStatus}
                data={["Dostupné", "Rezervováno", "Prodáno"]}
                clearable
                radius="md"
              />
            </SimpleGrid>

            {/* Druhý řádek: Fixnutý přepínač Vše / Zdarma / Placené */}
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
                  root: {
                    backgroundColor: "#f1f3f5",
                    padding: "4px", // Větší prostor kolem aktivního prvku, aby neubíral místo textu
                  },
                  indicator: {
                    backgroundColor: "white",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
                  },
                  label: {
                    fontWeight: 500,
                    paddingTop: "6px",
                    paddingBottom: "6px", // Bezpečný padding pro text, aby se nepřekrýval s okraji
                    color: "#495057",
                  },
                  control: {
                    // Odstraní případné podivné border a outline konflikty, které způsobovaly překrytí
                    border: "none",
                  },
                }}
              />
            </Box>
          </Stack>
        </Card>

        {/* --- Sekce pro inzeráty (placeholder) --- */}
        <Card withBorder padding="md" radius="md" bg="white">
          <Text size="sm" c="dimmed" ta="center">
            nabídky
          </Text>
        </Card>
      </Stack>

      {/* ========================================================= */}
      {/* ==================== VYSKAKOVACÍ MODAL =================== */}
      {/* ========================================================= */}
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
        {/* --- Samotný formulář laděný do oranžova --- */}
        <Stack gap="md">
          <TextInput label="Název věci *" placeholder="Např. Konferenční stolek" required radius="md" />

          <Textarea
            label="Popis"
            placeholder="Popiš stav, rozměry, místo předání..."
            minRows={3}
            autosize
            radius="md"
          />

          <Select
            label="Kategorie *"
            placeholder="Vyber kategorii"
            data={["ELEKTRONIKA", "DĚTSKÉ VĚCI", "KNIHY", "NÁBYTEK", "OSTATNÍ"]}
            required
            radius="md"
          />

          <Group align="flex-end">
            <NumberInput
              label="Cena"
              defaultValue={0}
              suffix=" Kč"
              thousandSeparator=" "
              placeholder="0 Kč"
              radius="md"
              style={{ flex: 1 }}
            />
            <Checkbox label="Nabídka je zdarma" mb="xs" color="orange" radius="sm" />
          </Group>

          <SimpleGrid cols={2} spacing="md">
            <TextInput label="Jméno kontaktu *" placeholder="Tvé jméno" required radius="md" />
            <TextInput label="E-mail" placeholder="jmeno@example.com" type="email" radius="md" />
          </SimpleGrid>

          <Select
            label="Stav nabídky"
            defaultValue="Dostupné"
            data={["Dostupné", "Rezervováno", "Prodáno"]}
            radius="md"
          />

          <TextInput label="URL obrázku (volitelné)" placeholder="https://..." radius="md" />

          <Text c="dimmed" size="xs" mt="xs">
            Platbu a předání si domluvíš přímo s kupujícím.
          </Text>

          <Group justify="flex-end" mt="xl">
            <Button color="orange" size="md" radius="md" onClick={close}>
              Přidat nabídku
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
