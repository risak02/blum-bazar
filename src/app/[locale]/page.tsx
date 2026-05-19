import { Badge, Box, Button, Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();

  return {
    title: t("page.home.title"),
    description: t("page.home.description"),
  };
}

export default async function Page(_: PageProps<"/[locale]">) {
  const t = await getTranslations();

  return (
    // šedé pozadi
    //box 1. celé pozadí
    <Box bg="gray.0" style={{ minHeight: "100vh", width: "100%" }}>
      {/* stack 1. cela stranka - udrzuje vsechno zarovnonane pod sebou */}
      <Stack gap="md" style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        {/*  group 1. nahore(nazev a tlacitko vpravo)- zarovna vedle sebe*/}
        <Group justify="space-between" align="flex-start">
          {/* stack 2. nahore*/}
          <Stack gap="xs" style={{ flex: 1 }}>
            {/* title 1. nazev obchodu(proc si toto vubec pisu vsak nejsem blbec) */}
            <Title order={1} size="h1" fw={700}>
              Bazar blogic store
            </Title>
            {/*  text 1. uvodni zprava nahore*/}
            <Text c="dimmed" size="sm" style={{ maxWidth: 600 }}>
              Interní bazar Blogic Store. Nabízej věci kolegům k prodeji nebo zdarma. Platbu a předání si domluvíte
              přímo mezi sebou.
            </Text>
          </Stack>
          {/* stack 1. konec */}
          {/* tlačitko vravo nahoře (nová nabídtka) */}
          <Button color="orange" size="md">
            + Přidat nabídku
          </Button>
        </Group>
        {/*  group 1. konec*/}

        {/* filtry (předělat) */}
        <Card withBorder padding="md" radius="md" bg="white">
          <Text size="sm" c="dimmed" ta="center">
            filtrace
          </Text>
        </Card>

        {/* nabýtky (předělat ) */}
        <Card withBorder radius="md" padding="xl" bg="white" mt="md">
          <Text c="dimmed" ta="center">
            nabídky
          </Text>
        </Card>
      </Stack>
    </Box>
  );
}
