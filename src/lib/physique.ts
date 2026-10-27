import { createServerFn } from "@tanstack/react-start";
import type { Build } from "@/lib/metrics";

export type PhysiqueRead = {
  ok: true;
  usable: boolean;
  note: string;
  build: Build | null;
  fatMid: number | null;
  fatSpan: number | null;
};

export type PhysiqueFailure = { ok: false; error: string };

const MAX_DATA_URL = 1_900_000;

function readImage(input: unknown): { imageDataUrl: string } {
  if (!input || typeof input !== "object") throw new Error("Bild fehlt.");
  const imageDataUrl = (input as { imageDataUrl?: unknown }).imageDataUrl;
  if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
    throw new Error("Bitte ein Foto im Format JPG oder PNG.");
  }
  if (imageDataUrl.length > MAX_DATA_URL) {
    throw new Error("Das Foto ist zu groß.");
  }
  return { imageDataUrl };
}

function asBuild(value: unknown): Build | null {
  if (value === "untrained" || value === "active" || value === "trained" || value === "muscular") return value;
  return null;
}

function parseModel(content: string): PhysiqueRead {
  const parsed = JSON.parse(content) as {
    usable?: unknown;
    note?: unknown;
    build?: unknown;
    fat_low?: unknown;
    fat_high?: unknown;
  };
  const usable = parsed.usable === true;
  const note = typeof parsed.note === "string" ? parsed.note.slice(0, 240) : "";
  const build = asBuild(parsed.build);
  const low = typeof parsed.fat_low === "number" ? parsed.fat_low : null;
  const high = typeof parsed.fat_high === "number" ? parsed.fat_high : null;
  const plausible =
    usable &&
    low != null &&
    high != null &&
    high >= low &&
    low >= 2 &&
    high <= 70 &&
    high - low <= 30;
  return {
    ok: true,
    usable: plausible,
    note: note || (plausible ? "Foto wurde berücksichtigt." : "An diesem Foto ist die Figur nicht zuverlässig zu erkennen."),
    build: plausible ? build : null,
    fatMid: plausible && low != null && high != null ? (low + high) / 2 : null,
    fatSpan: plausible && low != null && high != null ? high - low : null,
  };
}

export const analyzePhysique = createServerFn({ method: "POST" })
  .validator(readImage)
  .handler(async ({ data }): Promise<PhysiqueRead | PhysiqueFailure> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "Die Bildanalyse ist hier gerade nicht verfügbar." };

    let res: Response;
    try {
      res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: 0,
          max_tokens: 300,
          messages: [
            {
              role: "system",
              content:
                "Du schätzt die Figur für einen Körperzusammensetzungs-Rechner. Identifiziere niemanden, bewerte niemanden, stelle keine Diagnose. Wenn kein klarer Blick auf den Körper eines Erwachsenen zu sehen ist, setze usable auf false. build: untrained (kaum sichtbare Muskulatur), active (etwas definiert), trained (deutlich athletisch), muscular (ausgeprägte Muskelmasse). fat_low und fat_high sind eine vorsichtige Spanne des Fettanteils in Prozent. Fotos täuschen — lieber eine weite Spanne. note: ein kurzer deutscher Satz an die Person.",
            },
            {
              role: "user",
              content: [
                { type: "input_image", image_url: data.imageDataUrl, detail: "high" },
                {
                  type: "input_text",
                  text: "Schätze Trainingsstand und eine Fettanteil-Spanne. Antworte nur im vorgegebenen JSON.",
                },
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "physique",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["usable", "note", "build", "fat_low", "fat_high"],
                properties: {
                  usable: { type: "boolean" },
                  note: { type: "string" },
                  build: { type: "string", enum: ["untrained", "active", "trained", "muscular", "unclear"] },
                  fat_low: { type: "number" },
                  fat_high: { type: "number" },
                },
              },
            },
          },
        }),
      });
    } catch {
      return { ok: false, error: "Die Bildanalyse ist gerade nicht erreichbar." };
    }

    if (res.status === 402 || res.status === 403) {
      return {
        ok: false,
        error: "Die Foto-Einschätzung ist gerade nicht verfügbar. Trainingsstand und Bandmaß funktionieren weiter.",
      };
    }
    if (!res.ok) return { ok: false, error: "Die Bildanalyse hat nicht geantwortet. Bitte später noch einmal." };

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) return { ok: false, error: "Die Bildanalyse hat keine Einschätzung geliefert." };
    try {
      return parseModel(content);
    } catch {
      return { ok: false, error: "Die Einschätzung war nicht lesbar." };
    }
  });
