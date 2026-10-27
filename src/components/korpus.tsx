import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import clsx from "clsx";
import { Trash2 } from "lucide-react";
import {
  assess,
  parseDecimal,
  parseHeightCm,
  type Assessment,
  type BuildChoice,
  type PhotoCue,
  type Sex,
  type Tone,
} from "@/lib/metrics";
import { analyzePhysique } from "@/lib/physique";

const DRAFT_KEY = "korpus.draft.v1";
const HISTORY_KEY = "korpus.history.v1";

type Entry = {
  id: string;
  at: string;
  sex: Sex | null;
  age: number | null;
  heightCm: number;
  weightKg: number;
  waistCm: number | null;
  neckCm: number | null;
  hipCm: number | null;
  bmi: number;
  fat: number | null;
};

type Draft = {
  sex: Sex | null;
  age: string;
  height: string;
  weight: string;
  waist: string;
  neck: string;
  hip: string;
  asian: boolean;
  build: BuildChoice;
};

function de(value: number, digits: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function deFlex(value: number, digits = 1): string {
  return value.toLocaleString("de-DE", { maximumFractionDigits: digits });
}

function fieldFrom(value: number | null): string {
  if (value == null) return "";
  return deFlex(value, 1);
}

function Chip({ tone, children }: { tone: Tone; children: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "good" && "bg-primary-soft text-primary",
        tone === "warn" && "bg-warn-soft text-warn",
        tone === "alert" && "bg-alert-soft text-alert",
      )}
    >
      {children}
    </span>
  );
}

function Field({
  id,
  label,
  unit,
  value,
  onChange,
  error,
  note,
  className,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  note?: string;
  className?: string;
}) {
  return (
    <label htmlFor={id} className={clsx("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium">{label}</span>
      <span
        className={clsx(
          "flex h-12 items-center rounded-md border bg-surface",
          error
            ? "border-alert"
            : "border-line focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
        )}
      >
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          autoComplete="off"
          className="h-full w-full bg-transparent px-3 text-base tabular-nums outline-none"
        />
        <span className="pr-3 text-sm text-muted">{unit}</span>
      </span>
      {error ? <span className="text-xs text-alert">{error}</span> : null}
      {!error && note ? <span className="text-xs text-muted">{note}</span> : null}
    </label>
  );
}

function BmiScale({ value, asian }: { value: number | null; asian: boolean }) {
  const min = 15;
  const max = 45;
  const cuts = asian ? [18.5, 23, 27.5] : [18.5, 25, 30];
  const zones = [
    { from: min, to: cuts[0], className: "bg-warn-soft" },
    { from: cuts[0], to: cuts[1], className: "bg-primary" },
    { from: cuts[1], to: cuts[2], className: "bg-warn" },
    { from: cuts[2], to: max, className: "bg-alert" },
  ];
  const span = max - min;
  const marker = value == null ? null : Math.min(max, Math.max(min, value));

  return (
    <div>
      <div className="relative h-2.5 rounded-full">
        <div className="flex h-full overflow-hidden rounded-full">
          {zones.map((zone) => (
            <div
              key={zone.from}
              className={clsx("h-full opacity-80", zone.className)}
              style={{ width: `${((zone.to - zone.from) / span) * 100}%` }}
            />
          ))}
        </div>
        {marker != null ? (
          <div
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ink"
            style={{ left: `${((marker - min) / span) * 100}%` }}
          />
        ) : null}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted tabular-nums">
        <span>15</span>
        <span>{asian ? "23" : "25"}</span>
        <span>{asian ? "27,5" : "30"}</span>
        <span>45</span>
      </div>
    </div>
  );
}

function weightSentence(weight: number, min: number, max: number): string {
  if (weight < min) return `${deFlex(min - weight)} kg unter dem Normalbereich`;
  if (weight > max) return `${deFlex(weight - max)} kg über dem Normalbereich`;
  return "Im Normalbereich für diese Größe";
}

function invalidMessage(label: string): string {
  return `${label} als Zahl, zum Beispiel mit Komma.`;
}

const BUILD_OPTIONS = [
  ["auto", "Automatisch"],
  ["untrained", "Wenig"],
  ["active", "Aktiv"],
  ["trained", "Trainiert"],
  ["muscular", "Sehr muskulös"],
] as const;

function isBuildChoice(value: unknown): value is BuildChoice {
  return BUILD_OPTIONS.some(([id]) => id === value);
}

async function shrinkPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 1024;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Foto ließ sich nicht lesen.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.72);
}

export function Korpus() {
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [neck, setNeck] = useState("");
  const [hip, setHip] = useState("");
  const [asian, setAsian] = useState(false);
  const [buildChoice, setBuildChoice] = useState<BuildChoice>("auto");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoCue, setPhotoCue] = useState<PhotoCue | null>(null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const readPhysique = useServerFn(analyzePhysique);
  const [history, setHistory] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);
  const [noted, setNoted] = useState(false);

  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(DRAFT_KEY);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as Draft;
        setSex(draft.sex);
        setAge(draft.age ?? "");
        setHeight(draft.height ?? "");
        setWeight(draft.weight ?? "");
        setWaist(draft.waist ?? "");
        setNeck(draft.neck ?? "");
        setHip(draft.hip ?? "");
        setAsian(Boolean(draft.asian));
        if (isBuildChoice(draft.build)) setBuildChoice(draft.build);
      }
      const rawHistory = localStorage.getItem(HISTORY_KEY);
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory) as unknown;
        if (Array.isArray(parsed)) setHistory(parsed as Entry[]);
      }
    } catch {
      /* ignore damaged local data */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const draft: Draft = { sex, age, height, weight, waist, neck, hip, asian, build: buildChoice };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [ready, sex, age, height, weight, waist, neck, hip, asian, buildChoice]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [ready, history]);

  useEffect(() => {
    if (!noted) return;
    const id = window.setTimeout(() => setNoted(false), 1600);
    return () => window.clearTimeout(id);
  }, [noted]);

  const ageParsed = parseDecimal(age);
  const heightParsed = parseHeightCm(height);
  const weightParsed = parseDecimal(weight);
  const waistParsed = parseDecimal(waist);
  const neckParsed = parseDecimal(neck);
  const hipParsed = parseDecimal(hip);

  const assessment: Assessment = useMemo(
    () =>
      assess({
        sex,
        age: ageParsed.state === "ok" ? ageParsed.value : null,
        heightCm: heightParsed.state === "ok" ? heightParsed.cm : null,
        weightKg: weightParsed.state === "ok" ? weightParsed.value : null,
        waistCm: waistParsed.state === "ok" ? waistParsed.value : null,
        neckCm: neckParsed.state === "ok" ? neckParsed.value : null,
        hipCm: hipParsed.state === "ok" ? hipParsed.value : null,
        asianCutoffs: asian,
        buildChoice,
        photo: photoCue,
      }),
    [sex, ageParsed, heightParsed, weightParsed, waistParsed, neckParsed, hipParsed, asian, buildChoice, photoCue],
  );

  const heightError =
    heightParsed.state === "invalid"
      ? "Zentimeter oder Meter, zum Beispiel 168 oder 1,68."
      : assessment.fieldErrors.height;
  const ageError = ageParsed.state === "invalid" ? invalidMessage("Alter") : assessment.fieldErrors.age;
  const weightError =
    weightParsed.state === "invalid" ? invalidMessage("Gewicht") : assessment.fieldErrors.weight;
  const waistError =
    waistParsed.state === "invalid" ? invalidMessage("Taille") : assessment.fieldErrors.waist;
  const neckError = neckParsed.state === "invalid" ? invalidMessage("Hals") : assessment.fieldErrors.neck;
  const hipError = hipParsed.state === "invalid" ? invalidMessage("Hüfte") : assessment.fieldErrors.hip;

  function clearFields() {
    setSex(null);
    setAge("");
    setHeight("");
    setWeight("");
    setWaist("");
    setNeck("");
    setHip("");
    setPhotoUrl(null);
    setPhotoCue(null);
    setPhotoNote(null);
    setPhotoError(null);
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError(null);
    setPhotoNote(null);
    setPhotoCue(null);
    try {
      const dataUrl = await shrinkPhoto(file);
      setPhotoUrl(dataUrl);
    } catch {
      setPhotoError("Dieses Foto ließ sich nicht lesen.");
    }
  }

  async function runPhoto() {
    if (!photoUrl || photoBusy) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const result = await readPhysique({ data: { imageDataUrl: photoUrl } });
      if (!result.ok) {
        setPhotoError(result.error);
        setPhotoCue(null);
      } else if (!result.usable || result.fatMid == null || result.fatSpan == null) {
        setPhotoNote(result.note);
        setPhotoCue(null);
      } else {
        setPhotoNote(result.note);
        setPhotoCue({ fatMid: result.fatMid, fatSpan: result.fatSpan, build: result.build });
      }
    } catch {
      setPhotoError("Die Bildanalyse ist gerade nicht erreichbar.");
    } finally {
      setPhotoBusy(false);
    }
  }

  function loadExample() {
    setSex("female");
    setAge("34");
    setHeight("168");
    setWeight("64");
    setWaist("74");
    setNeck("32");
    setHip("98");
  }

  function remember() {
    if (!assessment.bmi || heightParsed.cm == null || weightParsed.value == null) return;
    const entry: Entry = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      sex,
      age: ageParsed.state === "ok" ? ageParsed.value : null,
      heightCm: heightParsed.cm,
      weightKg: weightParsed.value,
      waistCm: waistParsed.state === "ok" ? waistParsed.value : null,
      neckCm: neckParsed.state === "ok" ? neckParsed.value : null,
      hipCm: hipParsed.state === "ok" ? hipParsed.value : null,
      bmi: assessment.bmi.value,
      fat: assessment.fat?.estimate ?? null,
    };
    setHistory((current) => [entry, ...current].slice(0, 24));
    setNoted(true);
  }

  function applyEntry(entry: Entry) {
    setSex(entry.sex);
    setAge(entry.age == null ? "" : fieldFrom(entry.age));
    setHeight(fieldFrom(entry.heightCm));
    setWeight(fieldFrom(entry.weightKg));
    setWaist(fieldFrom(entry.waistCm));
    setNeck(fieldFrom(entry.neckCm));
    setHip(fieldFrom(entry.hipCm));
  }

  const bmi = assessment.bmi;
  const fat = assessment.fat;
  const included = fat?.methods.filter((row) => row.inEstimate) ?? [];
  const spreadLo = included.length ? Math.min(...included.map((row) => row.value)) : null;
  const spreadHi = included.length ? Math.max(...included.map((row) => row.value)) : null;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 pb-24 md:py-12">
      <header className="max-w-2xl">
        <p className="text-xs font-medium tracking-widest text-primary uppercase">Körpermaße</p>
        <h1 className="mt-2 font-display text-5xl leading-none text-ink md:text-6xl">Korpus</h1>
        <p className="mt-4 max-w-xl text-base text-muted">
          Der BMI ist die Definition, gerechnet ohne versteckte Rundung. Der Fettanteil ist eine Schätzung
          aus Formeln, die gegen DXA und Luftverdrängung geprüft wurden — enger, sobald ein Bandmaß dazukommt.
        </p>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-5">
        <form
          className="rounded-lg border border-line bg-surface p-5 shadow-card lg:col-span-2 md:p-6"
          onSubmit={(event) => event.preventDefault()}
        >
          <p className="text-xs font-medium tracking-widest text-muted uppercase">01 — Eingabe</p>
          <h2 className="mt-2 font-display text-3xl">Maße</h2>

          <div className="mt-5">
            <p id="sex-label" className="text-sm font-medium">
              Geschlecht
            </p>
            <div role="radiogroup" aria-labelledby="sex-label" className="mt-1.5 grid grid-cols-2 gap-1 rounded-md bg-bg p-1">
              {(
                [
                  ["female", "Weiblich"],
                  ["male", "Männlich"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={sex === value}
                  onClick={() => setSex(value)}
                  className={clsx(
                    "h-11 rounded-sm text-sm font-medium",
                    sex === value ? "bg-surface text-ink shadow-sm" : "text-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">Die Studien unterscheiden nur diese beiden Gruppen.</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field id="age" label="Alter" unit="Jahre" value={age} onChange={setAge} error={ageError} />
            <Field
              id="height"
              label="Größe"
              unit="cm"
              value={height}
              onChange={setHeight}
              error={heightError}
              note={
                heightParsed.assumedMeters && heightParsed.cm != null
                  ? `Als ${deFlex(heightParsed.cm, 1)} cm gelesen.`
                  : undefined
              }
            />
            <Field id="weight" label="Gewicht" unit="kg" value={weight} onChange={setWeight} error={weightError} />
            <Field
              id="waist"
              label="Taillenumfang"
              unit="cm"
              value={waist}
              onChange={setWaist}
              error={waistError}
              note={sex === "male" ? "Auf Nabelhöhe." : "Schmalste Stelle."}
            />
            <Field
              id="neck"
              label="Halsumfang"
              unit="cm"
              value={neck}
              onChange={setNeck}
              error={neckError}
              note="Unter dem Kehlkopf."
            />
            <Field
              id="hip"
              label="Hüftumfang"
              unit="cm"
              value={hip}
              onChange={setHip}
              error={hipError}
              note="Weiteste Stelle."
            />
          </div>

          <div className="mt-5">
            <p id="build-label" className="text-sm font-medium">
              Trainingsstand
            </p>
            <div role="radiogroup" aria-labelledby="build-label" className="mt-1.5 grid grid-cols-2 gap-1 rounded-md bg-bg p-1">
              {BUILD_OPTIONS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={buildChoice === value}
                  onClick={() => setBuildChoice(value)}
                  className={clsx(
                    "h-11 rounded-sm px-2 text-sm font-medium",
                    value === "auto" && "col-span-2",
                    buildChoice === value ? "bg-surface text-ink shadow-sm" : "text-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Automatisch erkennt Muskulatur am Taillenverhältnis. Ohne Bandmaß den Trainingsstand wählen — der BMI allein sieht Muskeln nicht.
            </p>
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium">Foto der Figur</p>
            <p className="mt-1 text-xs text-muted">
              Optional. Das Foto bleibt in diesem Browser, wird einmal zur Einschätzung geschickt und nicht gespeichert. Es ist eine grobe Sichtprüfung, kein Scan.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                void onPhoto(file);
                event.target.value = "";
              }}
            />
            {photoUrl ? (
              <img src={photoUrl} alt="Hochgeladenes Foto der Figur" className="mt-3 max-h-40 rounded-md object-contain" />
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="h-11 rounded-md border border-line bg-surface px-3 text-sm font-medium"
              >
                Foto wählen
              </button>
              <button
                type="button"
                onClick={() => void runPhoto()}
                disabled={!photoUrl || photoBusy}
                className="h-11 rounded-md bg-primary px-3 text-sm font-medium text-primary-fg disabled:opacity-40"
              >
                {photoBusy ? "Wird gelesen…" : "Figur auswerten"}
              </button>
            </div>
            {photoNote ? <p className="mt-2 text-sm text-muted">{photoNote}</p> : null}
            {photoError ? <p className="mt-2 text-sm text-alert">{photoError}</p> : null}
          </div>

          <details className="mt-4 rounded-md bg-bg px-3 py-3">
            <summary className="text-sm font-medium">Wie das Bandmaß sitzen soll</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted">
              <li>Stehend, Band anliegend, nicht einschnürend, nach normalem Ausatmen.</li>
              <li>Taille: Männer auf Nabelhöhe, Frauen an der schmalsten Stelle.</li>
              <li>Hals direkt unter dem Kehlkopf. Das Band fällt nach vorn leicht ab.</li>
              <li>Hüfte an der weitesten Stelle des Gesäßes, waagerecht. Bei Frauen fließt sie in die Navy-Formel ein.</li>
            </ul>
          </details>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadExample}
              className="h-11 rounded-md border border-line bg-surface px-3 text-sm font-medium"
            >
              Beispiel
            </button>
            <button type="button" onClick={clearFields} className="h-11 rounded-md px-3 text-sm font-medium text-muted">
              Felder leeren
            </button>
          </div>
        </form>

        <section
          className="rounded-lg border border-line bg-surface p-5 shadow-card lg:col-span-3 md:p-6"
          aria-live="polite"
        >
          <p className="text-xs font-medium tracking-widest text-muted uppercase">02 — Ergebnis</p>
          <h2 className="mt-2 font-display text-3xl">Rechnung</h2>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium tracking-widest text-muted uppercase">BMI</p>
              <p className={clsx("mt-2 font-display text-4xl tabular-nums leading-none md:text-5xl", !bmi && "text-faint")}>
                {bmi ? de(bmi.value, 2) : "–"}
              </p>
              {bmi ? (
                <div className="mt-3 flex flex-col items-start gap-2">
                  <Chip tone={bmi.tone}>{bmi.category}</Chip>
                  {bmi.adjusted ? (
                    <p className="text-sm text-muted">
                      WHO ohne Muskelkorrektur: {bmi.whoCategory}. {bmi.adjustedNote}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">Aus Größe und Gewicht.</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium tracking-widest text-muted uppercase">Körperfett</p>
              <p className={clsx("mt-2 font-display text-4xl tabular-nums leading-none md:text-5xl", !fat && "text-faint")}>
                {fat ? (
                  <>
                    {de(fat.estimate, 1)}
                    <span className="text-2xl"> %</span>
                  </>
                ) : (
                  "–"
                )}
              </p>
              {fat ? (
                <div className="mt-3 flex flex-col items-start gap-2">
                  <Chip tone={fat.tone}>{fat.category}</Chip>
                  <p className="text-sm text-muted">
                    {fat.buildLabel}
                    <span className="text-faint"> · </span>
                    {fat.buildSource}
                  </p>
                  <p className="text-sm text-muted tabular-nums">typisch ± {de(fat.uncertainty, 1)} Punkte</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">Schätzung, sobald Alter und Geschlecht da sind.</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <BmiScale value={bmi?.value ?? null} asian={asian} />
            <div role="radiogroup" aria-label="BMI-Grenzwerte" className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-bg p-1">
              {(
                [
                  [false, "WHO"],
                  [true, "Asien, WHO 2004"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={asian === value}
                  onClick={() => setAsian(value)}
                  className={clsx(
                    "h-11 rounded-sm px-2 text-sm font-medium",
                    asian === value ? "bg-surface text-ink shadow-sm" : "text-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">{bmi?.scaleNote ?? "WHO ab 25, oder die asiatischen Aktionsgrenzen ab 23."}</p>
          </div>

          {bmi && weightParsed.value != null && heightParsed.cm != null ? (
            <div className="mt-5 border-t border-line pt-5 text-sm">
              <p className="tabular-nums">
                {deFlex(weightParsed.value, 2)} kg bei {deFlex(heightParsed.cm, 1)} cm ={" "}
                <span className="font-medium">{de(bmi.value, 4)} kg/m²</span>
              </p>
              <p className="mt-1 text-muted">
                {bmi.adjusted
                  ? `Rechnerisch über der WHO-Spanne von ${de(bmi.healthyMinKg, 1)}–${de(bmi.healthyMaxKg, 1)} kg. Die Einordnung folgt der Muskelmasse, nicht dieser Spanne. Bei BMI 22,0 wären es ${de(bmi.weightAt22, 1)} kg.`
                  : `${weightSentence(weightParsed.value, bmi.healthyMinKg, bmi.healthyMaxKg)}. Spanne ${de(bmi.healthyMinKg, 1)}–${de(bmi.healthyMaxKg, 1)} kg. Bei BMI 22,0 wären es ${de(bmi.weightAt22, 1)} kg.`}
              </p>
            </div>
          ) : null}

          {fat ? (
            <div className="mt-5 border-t border-line pt-5">
              <div className="flex h-3 overflow-hidden rounded-full bg-primary">
                <div className="h-full bg-warn" style={{ width: `${Math.min(fat.estimate, 100)}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-sm tabular-nums">
                <span>{de(fat.fatMassKg, 1)} kg Fett</span>
                <span className="text-muted">{de(fat.leanMassKg, 1)} kg fettfrei</span>
              </div>
              {spreadLo != null && spreadHi != null && included.length > 1 ? (
                <p className="mt-2 text-sm text-muted tabular-nums">
                  Spanne der Verfahren {de(spreadLo, 1)}–{de(spreadHi, 1)} %. {fat.categoryNote}.
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted">{fat.categoryNote}.</p>
              )}

              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md bg-bg px-3 py-3">
                  <dt className="text-xs text-muted">Fettmasse</dt>
                  <dd className="mt-1 font-display text-2xl tabular-nums leading-none">{de(fat.fatMassKg, 1)} kg</dd>
                </div>
                <div className="rounded-md bg-bg px-3 py-3">
                  <dt className="text-xs text-muted">Fettfreie Masse</dt>
                  <dd className="mt-1 font-display text-2xl tabular-nums leading-none">{de(fat.leanMassKg, 1)} kg</dd>
                </div>
                <div className="rounded-md bg-bg px-3 py-3">
                  <dt className="text-xs text-muted">FFMI</dt>
                  <dd className="mt-1 font-display text-2xl tabular-nums leading-none">{de(fat.ffmi, 1)}</dd>
                  <p className="mt-1 text-xs text-muted">
                    Normiert {de(fat.ffmiNormalized, 1)}. Ab etwa {sex === "female" ? "19,5" : "23"} gilt die Statur als sehr muskulös.
                  </p>
                </div>
                {assessment.waistToHeight ? (
                  <div className="rounded-md bg-bg px-3 py-3">
                    <dt className="text-xs text-muted">Taille / Größe</dt>
                    <dd className="mt-1 font-display text-2xl tabular-nums leading-none">
                      {de(assessment.waistToHeight.value, 2)}
                    </dd>
                    <p className="mt-1 text-xs text-muted">{assessment.waistToHeight.detail}</p>
                  </div>
                ) : null}
                {assessment.waistToHip ? (
                  <div className="rounded-md bg-bg px-3 py-3">
                    <dt className="text-xs text-muted">Taille / Hüfte</dt>
                    <dd className="mt-1 font-display text-2xl tabular-nums leading-none">
                      {de(assessment.waistToHip.value, 2)}
                    </dd>
                    <p className="mt-1 text-xs text-muted">{assessment.waistToHip.detail}</p>
                  </div>
                ) : null}
              </dl>

              <ul className="mt-5 flex flex-col gap-3">
                {[...fat.methods]
                  .sort((a, b) => Number(b.inEstimate) - Number(a.inEstimate))
                  .map((row) => (
                    <li key={row.id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-medium">
                          {row.name}
                          <span className="ml-2 text-xs font-normal text-muted">
                            {row.inEstimate ? "in der Schätzung" : "nur Vergleich"}
                          </span>
                        </p>
                        <p className="text-sm tabular-nums">{de(row.value, 1)} %</p>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                        <div
                          className={clsx("h-full rounded-full", row.inEstimate ? "bg-primary" : "bg-faint")}
                          style={{ width: `${Math.min(100, (row.value / 50) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted">{row.detail}</p>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          {assessment.hint ? (
            <p className="mt-5 rounded-md bg-primary-soft px-3 py-3 text-sm text-primary">{assessment.hint}</p>
          ) : null}
          {assessment.warnings.map((warning) => (
            <p key={warning} className="mt-3 rounded-md bg-warn-soft px-3 py-3 text-sm text-warn">
              {warning}
            </p>
          ))}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={remember}
              disabled={!bmi}
              className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-fg disabled:opacity-40"
            >
              {noted ? "Gemerkt" : "Messung merken"}
            </button>
            <p className="text-xs text-muted">Bleibt in diesem Browser.</p>
          </div>

          {bmi ? (
            <details className="mt-4 rounded-md bg-bg px-3 py-3">
              <summary className="text-sm font-medium">Rechenweg</summary>
              <div className="mt-2 space-y-2 text-sm text-muted">
                <p>
                  BMI = Gewicht geteilt durch Größe im Quadrat. Angezeigt auf zwei Stellen, gerechnet mit der vollen
                  Zahl ({bmi ? de(bmi.value, 4) : ""}).
                </p>
                <p>
                  Der Fettanteil ist das gewichtete Mittel der markierten Verfahren: CUN-BAE mit Gewicht 1, Relative
                  Fat Mass mit 1,2, US Navy mit 1,45. Deurenberg nutzt dieselben Grunddaten wie CUN-BAE und wird
                  deshalb nicht ein zweites Mal gemittelt.
                </p>
                <p>
                  Bei trainierter Statur zählen Umfangsformeln stärker als CUN-BAE, weil ein hoher BMI dort sonst als Fett gelesen wird. Ohne Bandmaß gibt es dafür einen ausgewiesenen Abzug. Ein Foto fließt nur ergänzend ein. Die Spanne „typisch ± …“ ist eine übliche Abweichung, keine Garantie. Kein Medizinprodukt.
                </p>
              </div>
            </details>
          ) : null}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-3xl">Verlauf</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Noch nichts gemerkt. Eine Messung bleibt nur auf diesem Gerät.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {history.map((entry) => (
              <li key={entry.id} className="flex items-center gap-2 px-3">
                <button type="button" onClick={() => applyEntry(entry)} className="min-h-11 flex-1 py-3 text-left">
                  <span className="block text-sm font-medium tabular-nums">
                    BMI {de(entry.bmi, 2)}
                    {entry.fat != null ? ` · ${de(entry.fat, 1)} % Fett` : ""}
                  </span>
                  <span className="block text-xs text-muted">
                    {new Date(entry.at).toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" · "}
                    {deFlex(entry.weightKg)} kg, {deFlex(entry.heightCm)} cm
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Messung löschen"
                  onClick={() => setHistory((current) => current.filter((item) => item.id !== entry.id))}
                  className="grid size-11 place-items-center rounded-md text-muted"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-10 max-w-3xl text-xs leading-relaxed text-muted">
        BMI nach WHO: kg/m². Fettanteil nach CUN-BAE (Gómez-Ambrosi et al., Diabetes Care 2012), Relative Fat Mass
        (Woolcott & Bergman, Scientific Reports 2018) und US Navy (Hodgdon & Beckett, 1984, Siri-Gleichung).
        Einordnung des Fetts in Anlehnung an Gallagher et al., American Journal of Clinical Nutrition 2000. Muskulöse
        Statur wird über die fettfreie Masse (FFMI, normiert nach Kouri) und das Taillenverhältnis erkannt; der BMI-Wert
        selbst bleibt unverändert. Nicht für Schwangere. Unter 18 Jahren keine Fettschätzung.
      </footer>
    </main>
  );
}
