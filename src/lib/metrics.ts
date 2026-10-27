/**
 * Body metrics.
 *
 * BMI is the WHO definition, kg/m², computed without intermediate rounding.
 *
 * Body fat is an estimate, never a measurement. Included when the inputs exist:
 * - CUN-BAE (Gómez-Ambrosi et al., Diabetes Care 2012) — BMI, age, sex,
 *   validated against air-displacement plethysmography.
 * - Relative Fat Mass (Woolcott & Bergman, Sci Rep 2018) — height and waist,
 *   validated against DXA in NHANES.
 * - US Navy (Hodgdon & Beckett, NHRC 1984) — circumferences via the Siri
 *   equation. Metric coefficients.
 * Deurenberg 1991 is shown for comparison only. It uses the same inputs as
 * CUN-BAE, so averaging it in would pretend two opinions are independent.
 */

export type Sex = "female" | "male";
export type Tone = "good" | "warn" | "alert";

export type DecimalParse = {
  state: "empty" | "partial" | "invalid" | "ok";
  value: number | null;
};

export function parseDecimal(raw: string): DecimalParse {
  const t = raw.trim();
  if (!t) return { state: "empty", value: null };
  if (/^\d+[,.]$/.test(t)) return { state: "partial", value: null };
  const norm = t.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(norm)) return { state: "invalid", value: null };
  return { state: "ok", value: Number(norm) };
}

/** Accept centimetres, or metres when the value is between 1.2 and 2.5. */
export function parseHeightCm(raw: string): {
  state: DecimalParse["state"];
  cm: number | null;
  assumedMeters: boolean;
} {
  const parsed = parseDecimal(raw);
  if (parsed.state !== "ok" || parsed.value == null) {
    return { state: parsed.state, cm: null, assumedMeters: false };
  }
  const n = parsed.value;
  if (n >= 1.2 && n <= 2.5) {
    const cm = Math.round(n * 1000) / 10;
    return { state: "ok", cm, assumedMeters: true };
  }
  return { state: "ok", cm: n, assumedMeters: false };
}

export function bmiValue(weightKg: number, heightCm: number): number {
  return (weightKg * 10_000) / (heightCm * heightCm);
}

/** sex: female = 1, male = 0. */
export function cunBae(bmi: number, age: number, sex: Sex): number {
  const s = sex === "female" ? 1 : 0;
  const b2 = bmi * bmi;
  return (
    -44.988 +
    0.503 * age +
    10.689 * s +
    3.172 * bmi -
    0.026 * b2 +
    0.181 * bmi * s -
    0.02 * bmi * age -
    0.005 * b2 * s +
    0.00021 * b2 * age
  );
}

/** sex: male = 1, female = 0 — opposite of CUN-BAE. */
export function deurenberg(bmi: number, age: number, sex: Sex): number {
  const s = sex === "male" ? 1 : 0;
  return 1.2 * bmi + 0.23 * age - 10.8 * s - 5.4;
}

/** Woolcott & Bergman 2018. Height and waist in the same unit. */
export function relativeFatMass(heightCm: number, waistCm: number, sex: Sex): number {
  const ratio = heightCm / waistCm;
  return sex === "female" ? 76 - 20 * ratio : 64 - 20 * ratio;
}

/**
 * US Navy body density, centimetres, then Siri: 495/D − 450.
 * Women need a hip measurement. Returns null when the log argument is not positive.
 */
export function navyBodyFat(
  heightCm: number,
  waistCm: number,
  neckCm: number,
  hipCm: number | null,
  sex: Sex,
): number | null {
  if (sex === "male") {
    const diff = waistCm - neckCm;
    if (diff <= 0 || heightCm <= 0) return null;
    const density = 1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(heightCm);
    if (density <= 0) return null;
    return 495 / density - 450;
  }
  if (hipCm == null) return null;
  const diff = waistCm + hipCm - neckCm;
  if (diff <= 0 || heightCm <= 0) return null;
  const density = 1.29579 - 0.35004 * Math.log10(diff) + 0.221 * Math.log10(heightCm);
  if (density <= 0) return null;
  return 495 / density - 450;
}

export type MethodId = "cun-bae" | "deurenberg" | "rfm" | "navy" | "photo";

export type Build = "untrained" | "active" | "trained" | "muscular";
export type BuildChoice = "auto" | Build;

export type PhotoCue = {
  fatMid: number;
  fatSpan: number;
  build: Build | null;
};

export type MethodRow = {
  id: MethodId;
  name: string;
  detail: string;
  value: number;
  inEstimate: boolean;
};

export type BmiAssessment = {
  value: number;
  category: string;
  tone: Tone;
  whoCategory: string;
  whoTone: Tone;
  adjusted: boolean;
  adjustedNote: string | null;
  healthyMinKg: number;
  healthyMaxKg: number;
  weightAt22: number;
  scaleNote: string;
};

export type FatAssessment = {
  estimate: number;
  uncertainty: number;
  category: string;
  tone: Tone;
  categoryNote: string;
  fatMassKg: number;
  leanMassKg: number;
  ffmi: number;
  ffmiNormalized: number;
  build: Build;
  buildLabel: string;
  buildSource: string;
  correctionPp: number;
  methods: MethodRow[];
  spread: number;
};

export type RatioItem = {
  value: number;
  label: string;
  tone: Tone;
  detail: string;
};

export type Assessment = {
  fieldErrors: Partial<Record<"age" | "height" | "weight" | "waist" | "neck" | "hip", string>>;
  bmi: BmiAssessment | null;
  fat: FatAssessment | null;
  waistToHeight: RatioItem | null;
  waistToHip: RatioItem | null;
  warnings: string[];
  hint: string | null;
};

export type AssessInput = {
  sex: Sex | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  waistCm: number | null;
  neckCm: number | null;
  hipCm: number | null;
  asianCutoffs: boolean;
  buildChoice?: BuildChoice;
  photo?: PhotoCue | null;
};

const LIMITS = {
  age: [10, 110],
  height: [90, 250],
  weight: [25, 350],
  waist: [45, 200],
  neck: [22, 70],
  hip: [60, 200],
} as const;

function inRange(n: number, [min, max]: readonly [number, number]): boolean {
  return n >= min && n <= max;
}

function plausibleFat(n: number): boolean {
  return Number.isFinite(n) && n >= 2 && n <= 70;
}

export function bmiCategory(bmi: number, asian: boolean): { category: string; tone: Tone } {
  if (bmi < 16) return { category: "Starkes Untergewicht", tone: "alert" };
  if (bmi < 17) return { category: "Mäßiges Untergewicht", tone: "warn" };
  if (bmi < 18.5) return { category: "Leichtes Untergewicht", tone: "warn" };
  if (asian) {
    if (bmi < 23) return { category: "Normalgewicht", tone: "good" };
    if (bmi < 27.5) return { category: "Erhöhtes Risiko", tone: "warn" };
    if (bmi < 32.5) return { category: "Hohes Risiko", tone: "alert" };
    return { category: "Sehr hohes Risiko", tone: "alert" };
  }
  if (bmi < 25) return { category: "Normalgewicht", tone: "good" };
  if (bmi < 30) return { category: "Übergewicht", tone: "warn" };
  if (bmi < 35) return { category: "Adipositas Grad I", tone: "alert" };
  if (bmi < 40) return { category: "Adipositas Grad II", tone: "alert" };
  return { category: "Adipositas Grad III", tone: "alert" };
}

/**
 * Adult %fat bands aligned to Gallagher et al., Am J Clin Nutr 2000
 * (cut points that correspond to BMI 18.5 / 25 / 30 by age and sex).
 */
export function fatCategory(sex: Sex, age: number, fat: number): { category: string; tone: Tone; note: string } {
  const male = sex === "male";
  const band = male
    ? age < 40
      ? { low: 8, over: 20, obese: 25 }
      : age < 60
        ? { low: 11, over: 22, obese: 28 }
        : { low: 13, over: 25, obese: 30 }
    : age < 40
      ? { low: 21, over: 33, obese: 39 }
      : age < 60
        ? { low: 23, over: 34, obese: 40 }
        : { low: 24, over: 36, obese: 42 };

  const note = `Altersband nach Gallagher ${age < 40 ? "20–39" : age < 60 ? "40–59" : "60–79"}`;
  if (fat < band.low) return { category: "Niedrig", tone: "warn", note };
  if (fat < band.over) return { category: "Im gesunden Bereich", tone: "good", note };
  if (fat < band.obese) return { category: "Erhöht", tone: "warn", note };
  return { category: "Deutlich erhöht", tone: "alert", note };
}

const BUILD_LABEL: Record<Build, string> = {
  untrained: "Wenig trainiert",
  active: "Aktiv",
  trained: "Trainiert",
  muscular: "Sehr muskulös",
};

const BUILD_RANK: Record<Build, number> = {
  untrained: 0,
  active: 1,
  trained: 2,
  muscular: 3,
};

/** Kouri et al.: FFMI brought to a 1.80 m frame, so a shorter person is not marked less muscular. */
export function normalizedFfmi(ffmi: number, heightCm: number): number {
  return ffmi + 6.1 * (1.8 - heightCm / 100);
}

export function classifyBuild(sex: Sex, ffmiNormalized: number): Build {
  const cuts = sex === "male" ? [18.5, 21, 23] : [15.5, 17.5, 19.5];
  if (ffmiNormalized < cuts[0]) return "untrained";
  if (ffmiNormalized < cuts[1]) return "active";
  if (ffmiNormalized < cuts[2]) return "trained";
  return "muscular";
}

function higherBuild(a: Build, b: Build): Build {
  return BUILD_RANK[a] >= BUILD_RANK[b] ? a : b;
}

export function resolveBuild(
  measured: Build,
  choice: BuildChoice,
  photoBuild: Build | null,
  waistSuggestsFat: boolean,
): { build: Build; source: string; capped: boolean } {
  if (choice !== "auto") {
    if (waistSuggestsFat && BUILD_RANK[choice] >= BUILD_RANK.trained) {
      return {
        build: "active",
        source: "Angabe begrenzt: die Taille ist dafür zu hoch",
        capped: true,
      };
    }
    return { build: choice, source: "Selbst angegeben", capped: false };
  }
  if (photoBuild && BUILD_RANK[photoBuild] > BUILD_RANK[measured]) {
    if (waistSuggestsFat) {
      return {
        build: measured,
        source: "Foto deutet auf mehr Muskulatur, die Taille begrenzt das",
        capped: true,
      };
    }
    return { build: photoBuild, source: "Foto, mit den Maßen abgeglichen", capped: false };
  }
  return { build: measured, source: "Aus fettfreier Masse und dem Taillenverhältnis", capped: false };
}

function whtr(ratio: number): RatioItem {
  if (ratio < 0.4) {
    return { value: ratio, label: "Sehr niedrig", tone: "warn", detail: "Unter 0,40 — eher zu wenig Umfang" };
  }
  if (ratio < 0.5) {
    return { value: ratio, label: "Günstig", tone: "good", detail: "Unter 0,5 — die Grenze nach Ashwell" };
  }
  if (ratio < 0.6) {
    return { value: ratio, label: "Erhöht", tone: "warn", detail: "Ab 0,5 steigt das metabolische Risiko" };
  }
  return { value: ratio, label: "Deutlich erhöht", tone: "alert", detail: "Ab 0,6 deutlich über der Hälfte der Körpergröße" };
}

function whr(ratio: number, sex: Sex): RatioItem {
  const cut = sex === "male" ? 0.9 : 0.85;
  if (ratio < cut) {
    return {
      value: ratio,
      label: "Unauffällig",
      tone: "good",
      detail: `WHO-Grenze ${sex === "male" ? "0,90" : "0,85"}`,
    };
  }
  return {
    value: ratio,
    label: "Erhöht",
    tone: "warn",
    detail: `Über der WHO-Grenze ${sex === "male" ? "0,90" : "0,85"}`,
  };
}

export function assess(input: AssessInput): Assessment {
  const fieldErrors: Assessment["fieldErrors"] = {};
  const warnings: string[] = [];

  const age = input.age;
  const height = input.heightCm;
  const weight = input.weightKg;
  const waist = input.waistCm;
  const neck = input.neckCm;
  const hip = input.hipCm;

  if (age != null && !inRange(age, LIMITS.age)) {
    fieldErrors.age = "Zwischen 10 und 110 Jahren.";
  }
  if (height != null && !inRange(height, LIMITS.height)) {
    fieldErrors.height = "Zwischen 90 und 250 cm — oder als Meter, zum Beispiel 1,72.";
  }
  if (weight != null && !inRange(weight, LIMITS.weight)) {
    fieldErrors.weight = "Zwischen 25 und 350 kg.";
  }
  if (waist != null && !inRange(waist, LIMITS.waist)) {
    fieldErrors.waist = "Zwischen 45 und 200 cm.";
  }
  if (neck != null && !inRange(neck, LIMITS.neck)) {
    fieldErrors.neck = "Zwischen 22 und 70 cm.";
  }
  if (hip != null && !inRange(hip, LIMITS.hip)) {
    fieldErrors.hip = "Zwischen 60 und 200 cm.";
  }

  const heightOk = height != null && !fieldErrors.height;
  const weightOk = weight != null && !fieldErrors.weight;
  const ageOk = age != null && !fieldErrors.age;
  const waistOk = waist != null && !fieldErrors.waist;
  const neckOk = neck != null && !fieldErrors.neck;
  const hipOk = hip != null && !fieldErrors.hip;

  let bmi: BmiAssessment | null = null;
  if (heightOk && weightOk && height != null && weight != null) {
    const value = bmiValue(weight, height);
    const cat = bmiCategory(value, input.asianCutoffs);
    const meters = height / 100;
    const lowBmi = 18.5;
    const highBmi = input.asianCutoffs ? 22.9 : 24.9;
    bmi = {
      value,
      category: cat.category,
      tone: cat.tone,
      whoCategory: cat.category,
      whoTone: cat.tone,
      adjusted: false,
      adjustedNote: null,
      healthyMinKg: lowBmi * meters * meters,
      healthyMaxKg: highBmi * meters * meters,
      weightAt22: 22 * meters * meters,
      scaleNote: input.asianCutoffs
        ? "Aktionsgrenzen der WHO-Expertenberatung 2004: erhöht ab 23, hoch ab 27,5."
        : "WHO-Klassen für Erwachsene. Übergewicht ab 25, Adipositas ab 30.",
    };
  }

  const waistToHeight =
    heightOk && waistOk && height != null && waist != null && waist > 0 ? whtr(waist / height) : null;
  const waistToHip =
    input.sex && waistOk && hipOk && waist != null && hip != null && hip > 0
      ? whr(waist / hip, input.sex)
      : null;

  let fat: FatAssessment | null = null;
  let hint: string | null = null;

  const adult = ageOk && age != null && age >= 18 && age <= 90;
  if (bmi && heightOk && weightOk && input.sex && adult && age != null && weight != null && height != null) {
    const sex = input.sex;
    const rows: MethodRow[] = [];

    const cun = cunBae(bmi.value, age, sex);
    if (plausibleFat(cun)) {
      rows.push({
        id: "cun-bae",
        name: "CUN-BAE",
        detail: "BMI, Alter, Geschlecht · gegen Luftverdrängung geprüft",
        value: cun,
        inEstimate: true,
      });
    }

    const deu = deurenberg(bmi.value, age, sex);
    if (plausibleFat(deu)) {
      rows.push({
        id: "deurenberg",
        name: "Deurenberg",
        detail: "Dieselben Grunddaten · nur zum Vergleich, nicht gemittelt",
        value: deu,
        inEstimate: false,
      });
    }

    if (waistOk && waist != null) {
      const rfm = relativeFatMass(height, waist, sex);
      if (plausibleFat(rfm)) {
        rows.push({
          id: "rfm",
          name: "Relative Fat Mass",
          detail: "Größe und Taille · gegen DXA geprüft",
          value: rfm,
          inEstimate: true,
        });
      } else {
        warnings.push("Relative Fat Mass liegt außerhalb des plausiblen Bereichs — Taille prüfen.");
      }
    }

    const navyReady =
      waistOk &&
      neckOk &&
      waist != null &&
      neck != null &&
      (sex === "male" || (hipOk && hip != null));
    if (navyReady && waist != null && neck != null) {
      const navy = navyBodyFat(height, waist, neck, sex === "female" ? hip : hip ?? null, sex);
      if (navy == null) {
        warnings.push(
          sex === "male"
            ? "Navy-Formel nicht rechenbar: die Taille muss größer als der Hals sein."
            : "Navy-Formel nicht rechenbar: Taille plus Hüfte muss größer als der Hals sein.",
        );
      } else if (!plausibleFat(navy)) {
        warnings.push("Navy-Formel außerhalb des plausiblen Bereichs — Bandmaß noch einmal anlegen.");
      } else {
        rows.push({
          id: "navy",
          name: "US Navy",
          detail: "Hals, Taille" + (sex === "female" ? ", Hüfte" : "") + " · Siri-Gleichung",
          value: navy,
          inEstimate: true,
        });
      }
    }

    const used = rows.filter((row) => row.inEstimate);
    if (used.length === 0) {
      warnings.push("Aus diesen Maßen wird kein plausibler Fettanteil. Eingaben prüfen.");
    } else {
      const standard: Record<MethodId, number> = {
        "cun-bae": 1,
        deurenberg: 0,
        rfm: 1.2,
        navy: 1.45,
        photo: 0,
      };
      const standardSum = used.reduce((sum, row) => sum + standard[row.id], 0);
      const provisional = used.reduce((sum, row) => sum + row.value * standard[row.id], 0) / standardSum;
      const provisionalLean = weight * (1 - provisional / 100);
      const provisionalFfmi = (provisionalLean * 10_000) / (height * height);
      const nFfmi = normalizedFfmi(provisionalFfmi, height);
      let measured = classifyBuild(sex, nFfmi);
      const hasTape = used.some((row) => row.id === "navy" || row.id === "rfm");
      if (!hasTape && BUILD_RANK[measured] > BUILD_RANK.active) measured = "active";
      const overweightCut = input.asianCutoffs ? 23 : 25;
      const navyRow = rows.find((row) => row.id === "navy");
      const navyLean =
        navyRow != null && navyRow.value < (sex === "male" ? 20 : 30);
      const waistLean = waistToHeight != null && waistToHeight.value < 0.5;
      if (bmi.value >= overweightCut && (waistLean || navyLean)) {
        measured = higherBuild(measured, "trained");
      }
      const waistSuggestsFat = waistToHeight != null && waistToHeight.value >= 0.55;
      const photo = input.photo ?? null;
      const resolved = resolveBuild(measured, input.buildChoice ?? "auto", photo?.build ?? null, waistSuggestsFat);
      if (resolved.capped) {
        warnings.push(resolved.source + ".");
      }
      const athletic = resolved.build === "trained" || resolved.build === "muscular";
      if (photo && plausibleFat(photo.fatMid)) {
        rows.push({
          id: "photo",
          name: "Foto",
          detail:
            photo.fatSpan > 12
              ? "Sichtprüfung, unsicher · nur schwach gewichtet"
              : "Sichtprüfung · nur als Ergänzung zu den Maßen",
          value: photo.fatMid,
          inEstimate: true,
        });
        used.push(rows[rows.length - 1]);
      }
      const weights: Record<MethodId, number> = athletic && hasTape
        ? { "cun-bae": 0.35, deurenberg: 0, rfm: 1.55, navy: 1.9, photo: photo && photo.fatSpan > 12 ? 0.35 : 0.7 }
        : { "cun-bae": 1, deurenberg: 0, rfm: 1.2, navy: 1.45, photo: photo && photo.fatSpan > 12 ? 0.4 : 0.75 };
      const weightSum = used.reduce((sum, row) => sum + weights[row.id], 0);
      let estimate = used.reduce((sum, row) => sum + row.value * weights[row.id], 0) / weightSum;
      const values = used.map((row) => row.value);
      const spread = Math.max(...values) - Math.min(...values);
      let uncertainty = used.length >= 3 ? 2.7 : used.length === 2 ? 3.2 : 4;
      if (age < 20 || age > 75) uncertainty += 0.8;
      let correctionPp = 0;
      const declared =
        (input.buildChoice != null && input.buildChoice !== "auto") ||
        (photo?.build === "trained" || photo?.build === "muscular");
      if (declared && !hasTape && !used.some((row) => row.id === "photo")) {
        if (athletic) {
          correctionPp = resolved.build === "muscular" ? 4.5 : 3;
          estimate -= correctionPp;
          uncertainty += 1.4;
        } else if (resolved.build === "active" && input.buildChoice === "active") {
          correctionPp = 1.2;
          estimate -= correctionPp;
          uncertainty += 0.6;
        }
      }
      if (photo) uncertainty += 0.5;
      estimate = Math.min(68, Math.max(3, estimate));
      const cat = fatCategory(sex, age, estimate);
      const fraction = estimate / 100;
      const fatMassKg = weight * fraction;
      const leanMassKg = weight - fatMassKg;
      const ffmi = (leanMassKg * 10_000) / (height * height);

      fat = {
        estimate,
        uncertainty,
        category: cat.category,
        tone: cat.tone,
        categoryNote: cat.note,
        fatMassKg,
        leanMassKg,
        ffmi,
        ffmiNormalized: normalizedFfmi(ffmi, height),
        build: resolved.build,
        buildLabel: BUILD_LABEL[resolved.build],
        buildSource: resolved.source,
        correctionPp,
        methods: rows,
        spread,
      };

      const heavy = bmi.whoTone === "warn" || bmi.whoTone === "alert";
      const leanEnough = cat.category === "Niedrig" || cat.category === "Im gesunden Bereich";
      if (heavy && leanEnough && athletic) {
        bmi = {
          ...bmi,
          category: "Muskulös, nicht übergewichtig",
          tone: "good",
          adjusted: true,
          adjustedNote: `Die Rechnung bleibt ${bmi.value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg/m². Nach der BMI-Klasse allein wäre das „${bmi.whoCategory}“. Fettanteil und Muskelmasse sprechen für Mehrgewicht aus Muskulatur.`,
        };
      }

      if (correctionPp > 0) {
        warnings.push(
          `BMI-Formeln zählen Muskelmasse als Fett. Deshalb ${correctionPp.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Punkte Abzug. Mit Taillen-, Hals- und Hüftumfang wird das genauer als dieser Abzug.`,
        );
      }

      if (age > 80) {
        warnings.push("Über 80 Jahre sind die Formeln dünn belegt. Die Spanne ist deshalb weiter.");
      } else if (age < 20) {
        warnings.push("Unter 20 Jahren sind die Erwachsenenformeln nur eine Näherung.");
      }
      if (spread > 8) {
        warnings.push(
          `Die Verfahren liegen ${spread.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Punkte auseinander. Meist sitzt das Bandmaß an einer anderen Stelle als in der jeweiligen Studie.`,
        );
      }
    }
  } else if (ageOk && age != null && age < 18 && bmi) {
    warnings.push(
      "Unter 18 gelten kindliche BMI-Perzentile, nicht diese Erwachsenenklassen. Eine Fettschätzung blenden wir deshalb aus.",
    );
  }

  if (fat && bmi) {
    const hasWaist = waistOk;
    const hasNeck = neckOk;
    const hasHip = hipOk;
    const sex = input.sex;
    if (!hasWaist && !hasNeck && !hasHip) {
      hint =
        "Mit Taille, Hals und — bei Frauen — Hüfte wird die Schätzung enger. Dann zählen nicht nur BMI, Alter und Geschlecht.";
    } else if (hasWaist && !hasNeck) {
      hint = "Halsumfang fehlt noch. Damit kann die Navy-Formel zusätzlich rechnen.";
    } else if (sex === "female" && hasWaist && hasNeck && !hasHip) {
      hint = "Hüftumfang fehlt noch. Für Frauen braucht die Navy-Formel die Hüfte.";
    } else if (sex == null) {
      hint = null;
    }
  } else if (bmi && !(ageOk && age != null && age < 18)) {
    const missing: string[] = [];
    if (!input.sex) missing.push("Geschlecht");
    if (!ageOk) missing.push("Alter");
    if (missing.length === 2) {
      hint = "Geschlecht und Alter noch angeben — ohne beides ist ein Fettanteil nicht seriös zu schätzen.";
    } else if (missing[0] === "Geschlecht") {
      hint = "Geschlecht wählen — die Fettschätzung ist danach kalibriert und ohne diese Angabe nicht seriös.";
    } else if (missing[0] === "Alter") {
      hint = "Alter ergänzen. Es verschiebt den Fettanteil deutlich und bestimmt die Einordnung.";
    }
  }

  if (!adult && ageOk && age != null && age >= 18 && age > 90 && bmi && input.sex) {
    warnings.push("Über 90 Jahre rechnen wir keinen Fettanteil. Die Formeln decken das nicht.");
  }

  return { fieldErrors, bmi, fat, waistToHeight, waistToHip, warnings, hint };
}
