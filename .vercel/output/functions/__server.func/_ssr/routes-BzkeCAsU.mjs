import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as Trash2 } from "../_libs/lucide-react.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BzkeCAsU.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function parseDecimal(raw) {
	const t = raw.trim();
	if (!t) return {
		state: "empty",
		value: null
	};
	if (/^\d+[,.]$/.test(t)) return {
		state: "partial",
		value: null
	};
	const norm = t.replace(",", ".");
	if (!/^\d+(\.\d+)?$/.test(norm)) return {
		state: "invalid",
		value: null
	};
	return {
		state: "ok",
		value: Number(norm)
	};
}
/** Accept centimetres, or metres when the value is between 1.2 and 2.5. */
function parseHeightCm(raw) {
	const parsed = parseDecimal(raw);
	if (parsed.state !== "ok" || parsed.value == null) return {
		state: parsed.state,
		cm: null,
		assumedMeters: false
	};
	const n = parsed.value;
	if (n >= 1.2 && n <= 2.5) return {
		state: "ok",
		cm: Math.round(n * 1e3) / 10,
		assumedMeters: true
	};
	return {
		state: "ok",
		cm: n,
		assumedMeters: false
	};
}
function bmiValue(weightKg, heightCm) {
	return weightKg * 1e4 / (heightCm * heightCm);
}
/** sex: female = 1, male = 0. */
function cunBae(bmi, age, sex) {
	const s = sex === "female" ? 1 : 0;
	const b2 = bmi * bmi;
	return -44.988 + .503 * age + 10.689 * s + 3.172 * bmi - .026 * b2 + .181 * bmi * s - .02 * bmi * age - .005 * b2 * s + 21e-5 * b2 * age;
}
/** sex: male = 1, female = 0 — opposite of CUN-BAE. */
function deurenberg(bmi, age, sex) {
	const s = sex === "male" ? 1 : 0;
	return 1.2 * bmi + .23 * age - 10.8 * s - 5.4;
}
/** Woolcott & Bergman 2018. Height and waist in the same unit. */
function relativeFatMass(heightCm, waistCm, sex) {
	const ratio = heightCm / waistCm;
	return sex === "female" ? 76 - 20 * ratio : 64 - 20 * ratio;
}
/**
* US Navy body density, centimetres, then Siri: 495/D − 450.
* Women need a hip measurement. Returns null when the log argument is not positive.
*/
function navyBodyFat(heightCm, waistCm, neckCm, hipCm, sex) {
	if (sex === "male") {
		const diff = waistCm - neckCm;
		if (diff <= 0 || heightCm <= 0) return null;
		const density = 1.0324 - .19077 * Math.log10(diff) + .15456 * Math.log10(heightCm);
		if (density <= 0) return null;
		return 495 / density - 450;
	}
	if (hipCm == null) return null;
	const diff = waistCm + hipCm - neckCm;
	if (diff <= 0 || heightCm <= 0) return null;
	const density = 1.29579 - .35004 * Math.log10(diff) + .221 * Math.log10(heightCm);
	if (density <= 0) return null;
	return 495 / density - 450;
}
var LIMITS = {
	age: [10, 110],
	height: [90, 250],
	weight: [25, 350],
	waist: [45, 200],
	neck: [22, 70],
	hip: [60, 200]
};
function inRange(n, [min, max]) {
	return n >= min && n <= max;
}
function plausibleFat(n) {
	return Number.isFinite(n) && n >= 2 && n <= 70;
}
function bmiCategory(bmi, asian) {
	if (bmi < 16) return {
		category: "Starkes Untergewicht",
		tone: "alert"
	};
	if (bmi < 17) return {
		category: "Mäßiges Untergewicht",
		tone: "warn"
	};
	if (bmi < 18.5) return {
		category: "Leichtes Untergewicht",
		tone: "warn"
	};
	if (asian) {
		if (bmi < 23) return {
			category: "Normalgewicht",
			tone: "good"
		};
		if (bmi < 27.5) return {
			category: "Erhöhtes Risiko",
			tone: "warn"
		};
		if (bmi < 32.5) return {
			category: "Hohes Risiko",
			tone: "alert"
		};
		return {
			category: "Sehr hohes Risiko",
			tone: "alert"
		};
	}
	if (bmi < 25) return {
		category: "Normalgewicht",
		tone: "good"
	};
	if (bmi < 30) return {
		category: "Übergewicht",
		tone: "warn"
	};
	if (bmi < 35) return {
		category: "Adipositas Grad I",
		tone: "alert"
	};
	if (bmi < 40) return {
		category: "Adipositas Grad II",
		tone: "alert"
	};
	return {
		category: "Adipositas Grad III",
		tone: "alert"
	};
}
/**
* Adult %fat bands aligned to Gallagher et al., Am J Clin Nutr 2000
* (cut points that correspond to BMI 18.5 / 25 / 30 by age and sex).
*/
function fatCategory(sex, age, fat) {
	const band = sex === "male" ? age < 40 ? {
		low: 8,
		over: 20,
		obese: 25
	} : age < 60 ? {
		low: 11,
		over: 22,
		obese: 28
	} : {
		low: 13,
		over: 25,
		obese: 30
	} : age < 40 ? {
		low: 21,
		over: 33,
		obese: 39
	} : age < 60 ? {
		low: 23,
		over: 34,
		obese: 40
	} : {
		low: 24,
		over: 36,
		obese: 42
	};
	const note = `Altersband nach Gallagher ${age < 40 ? "20–39" : age < 60 ? "40–59" : "60–79"}`;
	if (fat < band.low) return {
		category: "Niedrig",
		tone: "warn",
		note
	};
	if (fat < band.over) return {
		category: "Im gesunden Bereich",
		tone: "good",
		note
	};
	if (fat < band.obese) return {
		category: "Erhöht",
		tone: "warn",
		note
	};
	return {
		category: "Deutlich erhöht",
		tone: "alert",
		note
	};
}
function whtr(ratio) {
	if (ratio < .4) return {
		value: ratio,
		label: "Sehr niedrig",
		tone: "warn",
		detail: "Unter 0,40 — eher zu wenig Umfang"
	};
	if (ratio < .5) return {
		value: ratio,
		label: "Günstig",
		tone: "good",
		detail: "Unter 0,5 — die Grenze nach Ashwell"
	};
	if (ratio < .6) return {
		value: ratio,
		label: "Erhöht",
		tone: "warn",
		detail: "Ab 0,5 steigt das metabolische Risiko"
	};
	return {
		value: ratio,
		label: "Deutlich erhöht",
		tone: "alert",
		detail: "Ab 0,6 deutlich über der Hälfte der Körpergröße"
	};
}
function whr(ratio, sex) {
	if (ratio < (sex === "male" ? .9 : .85)) return {
		value: ratio,
		label: "Unauffällig",
		tone: "good",
		detail: `WHO-Grenze ${sex === "male" ? "0,90" : "0,85"}`
	};
	return {
		value: ratio,
		label: "Erhöht",
		tone: "warn",
		detail: `Über der WHO-Grenze ${sex === "male" ? "0,90" : "0,85"}`
	};
}
function assess(input) {
	const fieldErrors = {};
	const warnings = [];
	const age = input.age;
	const height = input.heightCm;
	const weight = input.weightKg;
	const waist = input.waistCm;
	const neck = input.neckCm;
	const hip = input.hipCm;
	if (age != null && !inRange(age, LIMITS.age)) fieldErrors.age = "Zwischen 10 und 110 Jahren.";
	if (height != null && !inRange(height, LIMITS.height)) fieldErrors.height = "Zwischen 90 und 250 cm — oder als Meter, zum Beispiel 1,72.";
	if (weight != null && !inRange(weight, LIMITS.weight)) fieldErrors.weight = "Zwischen 25 und 350 kg.";
	if (waist != null && !inRange(waist, LIMITS.waist)) fieldErrors.waist = "Zwischen 45 und 200 cm.";
	if (neck != null && !inRange(neck, LIMITS.neck)) fieldErrors.neck = "Zwischen 22 und 70 cm.";
	if (hip != null && !inRange(hip, LIMITS.hip)) fieldErrors.hip = "Zwischen 60 und 200 cm.";
	const heightOk = height != null && !fieldErrors.height;
	const weightOk = weight != null && !fieldErrors.weight;
	const ageOk = age != null && !fieldErrors.age;
	const waistOk = waist != null && !fieldErrors.waist;
	const neckOk = neck != null && !fieldErrors.neck;
	const hipOk = hip != null && !fieldErrors.hip;
	let bmi = null;
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
			healthyMinKg: lowBmi * meters * meters,
			healthyMaxKg: highBmi * meters * meters,
			weightAt22: 22 * meters * meters,
			scaleNote: input.asianCutoffs ? "Aktionsgrenzen der WHO-Expertenberatung 2004: erhöht ab 23, hoch ab 27,5." : "WHO-Klassen für Erwachsene. Übergewicht ab 25, Adipositas ab 30."
		};
	}
	const waistToHeight = heightOk && waistOk && height != null && waist != null && waist > 0 ? whtr(waist / height) : null;
	const waistToHip = input.sex && waistOk && hipOk && waist != null && hip != null && hip > 0 ? whr(waist / hip, input.sex) : null;
	let fat = null;
	let hint = null;
	const adult = ageOk && age != null && age >= 18 && age <= 90;
	if (bmi && heightOk && weightOk && input.sex && adult && age != null && weight != null && height != null) {
		const sex = input.sex;
		const rows = [];
		const cun = cunBae(bmi.value, age, sex);
		if (plausibleFat(cun)) rows.push({
			id: "cun-bae",
			name: "CUN-BAE",
			detail: "BMI, Alter, Geschlecht · gegen Luftverdrängung geprüft",
			value: cun,
			inEstimate: true
		});
		const deu = deurenberg(bmi.value, age, sex);
		if (plausibleFat(deu)) rows.push({
			id: "deurenberg",
			name: "Deurenberg",
			detail: "Dieselben Grunddaten · nur zum Vergleich, nicht gemittelt",
			value: deu,
			inEstimate: false
		});
		if (waistOk && waist != null) {
			const rfm = relativeFatMass(height, waist, sex);
			if (plausibleFat(rfm)) rows.push({
				id: "rfm",
				name: "Relative Fat Mass",
				detail: "Größe und Taille · gegen DXA geprüft",
				value: rfm,
				inEstimate: true
			});
			else warnings.push("Relative Fat Mass liegt außerhalb des plausiblen Bereichs — Taille prüfen.");
		}
		if (waistOk && neckOk && waist != null && neck != null && (sex === "male" || hipOk && hip != null) && waist != null && neck != null) {
			const navy = navyBodyFat(height, waist, neck, sex === "female" ? hip : hip ?? null, sex);
			if (navy == null) warnings.push(sex === "male" ? "Navy-Formel nicht rechenbar: die Taille muss größer als der Hals sein." : "Navy-Formel nicht rechenbar: Taille plus Hüfte muss größer als der Hals sein.");
			else if (!plausibleFat(navy)) warnings.push("Navy-Formel außerhalb des plausiblen Bereichs — Bandmaß noch einmal anlegen.");
			else rows.push({
				id: "navy",
				name: "US Navy",
				detail: "Hals, Taille" + (sex === "female" ? ", Hüfte" : "") + " · Siri-Gleichung",
				value: navy,
				inEstimate: true
			});
		}
		const used = rows.filter((row) => row.inEstimate);
		if (used.length === 0) warnings.push("Aus diesen Maßen wird kein plausibler Fettanteil. Eingaben prüfen.");
		else {
			const weights = {
				"cun-bae": 1,
				deurenberg: 0,
				rfm: 1.2,
				navy: 1.45
			};
			const weightSum = used.reduce((sum, row) => sum + weights[row.id], 0);
			const estimate = used.reduce((sum, row) => sum + row.value * weights[row.id], 0) / weightSum;
			const values = used.map((row) => row.value);
			const spread = Math.max(...values) - Math.min(...values);
			let uncertainty = used.length >= 3 ? 2.7 : used.length === 2 ? 3.2 : 4;
			if (age < 20 || age > 75) uncertainty += .8;
			const cat = fatCategory(sex, age, estimate);
			const fatMassKg = weight * (estimate / 100);
			const leanMassKg = weight - fatMassKg;
			const ffmi = leanMassKg * 1e4 / (height * height);
			fat = {
				estimate,
				uncertainty,
				category: cat.category,
				tone: cat.tone,
				categoryNote: cat.note,
				fatMassKg,
				leanMassKg,
				ffmi,
				methods: rows,
				spread
			};
			if (age > 80) warnings.push("Über 80 Jahre sind die Formeln dünn belegt. Die Spanne ist deshalb weiter.");
			else if (age < 20) warnings.push("Unter 20 Jahren sind die Erwachsenenformeln nur eine Näherung.");
			if (spread > 6) warnings.push(`Die Verfahren liegen ${spread.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Punkte auseinander. Meist sitzt das Bandmaß an einer anderen Stelle als in der jeweiligen Studie.`);
		}
	} else if (ageOk && age != null && age < 18 && bmi) warnings.push("Unter 18 gelten kindliche BMI-Perzentile, nicht diese Erwachsenenklassen. Eine Fettschätzung blenden wir deshalb aus.");
	if (fat && bmi) {
		const hasWaist = waistOk;
		const hasNeck = neckOk;
		const hasHip = hipOk;
		const sex = input.sex;
		if (!hasWaist && !hasNeck && !hasHip) hint = "Mit Taille, Hals und — bei Frauen — Hüfte wird die Schätzung enger. Dann zählen nicht nur BMI, Alter und Geschlecht.";
		else if (hasWaist && !hasNeck) hint = "Halsumfang fehlt noch. Damit kann die Navy-Formel zusätzlich rechnen.";
		else if (sex === "female" && hasWaist && hasNeck && !hasHip) hint = "Hüftumfang fehlt noch. Für Frauen braucht die Navy-Formel die Hüfte.";
		else if (sex == null) hint = null;
	} else if (bmi && !(ageOk && age != null && age < 18)) {
		const missing = [];
		if (!input.sex) missing.push("Geschlecht");
		if (!ageOk) missing.push("Alter");
		if (missing.length === 2) hint = "Geschlecht und Alter noch angeben — ohne beides ist ein Fettanteil nicht seriös zu schätzen.";
		else if (missing[0] === "Geschlecht") hint = "Geschlecht wählen — die Fettschätzung ist danach kalibriert und ohne diese Angabe nicht seriös.";
		else if (missing[0] === "Alter") hint = "Alter ergänzen. Es verschiebt den Fettanteil deutlich und bestimmt die Einordnung.";
	}
	if (!adult && ageOk && age != null && age >= 18 && age > 90 && bmi && input.sex) warnings.push("Über 90 Jahre rechnen wir keinen Fettanteil. Die Formeln decken das nicht.");
	return {
		fieldErrors,
		bmi,
		fat,
		waistToHeight,
		waistToHip,
		warnings,
		hint
	};
}
var DRAFT_KEY = "korpus.draft.v1";
var HISTORY_KEY = "korpus.history.v1";
function de(value, digits) {
	return value.toLocaleString("de-DE", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	});
}
function deFlex(value, digits = 1) {
	return value.toLocaleString("de-DE", { maximumFractionDigits: digits });
}
function fieldFrom(value) {
	if (value == null) return "";
	return deFlex(value, 1);
}
function Chip({ tone, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", tone === "good" && "bg-primary-soft text-primary", tone === "warn" && "bg-warn-soft text-warn", tone === "alert" && "bg-alert-soft text-alert"),
		children
	});
}
function Field({ id, label, unit, value, onChange, error, note, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		htmlFor: id,
		className: clsx("flex flex-col gap-1.5", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: clsx("flex h-12 items-center rounded-md border bg-surface", error ? "border-alert" : "border-line focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					id,
					value,
					onChange: (event) => onChange(event.target.value),
					inputMode: "decimal",
					autoComplete: "off",
					className: "h-full w-full bg-transparent px-3 text-base tabular-nums outline-none"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "pr-3 text-sm text-muted",
					children: unit
				})]
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-xs text-alert",
				children: error
			}) : null,
			!error && note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-xs text-muted",
				children: note
			}) : null
		]
	});
}
function BmiScale({ value, asian }) {
	const min = 15;
	const max = 45;
	const cuts = asian ? [
		18.5,
		23,
		27.5
	] : [
		18.5,
		25,
		30
	];
	const zones = [
		{
			from: min,
			to: cuts[0],
			className: "bg-warn-soft"
		},
		{
			from: cuts[0],
			to: cuts[1],
			className: "bg-primary"
		},
		{
			from: cuts[1],
			to: cuts[2],
			className: "bg-warn"
		},
		{
			from: cuts[2],
			to: max,
			className: "bg-alert"
		}
	];
	const span = 30;
	const marker = value == null ? null : Math.min(max, Math.max(min, value));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-2.5 rounded-full",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex h-full overflow-hidden rounded-full",
			children: zones.map((zone) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: clsx("h-full opacity-80", zone.className),
				style: { width: `${(zone.to - zone.from) / span * 100}%` }
			}, zone.from))
		}), marker != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ink",
			style: { left: `${(marker - min) / span * 100}%` }
		}) : null]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-2 flex justify-between text-xs text-muted tabular-nums",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "15" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: asian ? "23" : "25" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: asian ? "27,5" : "30" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "45" })
		]
	})] });
}
function weightSentence(weight, min, max) {
	if (weight < min) return `${deFlex(min - weight)} kg unter dem Normalbereich`;
	if (weight > max) return `${deFlex(weight - max)} kg über dem Normalbereich`;
	return "Im Normalbereich für diese Größe";
}
function invalidMessage(label) {
	return `${label} als Zahl, zum Beispiel mit Komma.`;
}
function Korpus() {
	const [sex, setSex] = (0, import_react.useState)(null);
	const [age, setAge] = (0, import_react.useState)("");
	const [height, setHeight] = (0, import_react.useState)("");
	const [weight, setWeight] = (0, import_react.useState)("");
	const [waist, setWaist] = (0, import_react.useState)("");
	const [neck, setNeck] = (0, import_react.useState)("");
	const [hip, setHip] = (0, import_react.useState)("");
	const [asian, setAsian] = (0, import_react.useState)(false);
	const [history, setHistory] = (0, import_react.useState)([]);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [noted, setNoted] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		try {
			const rawDraft = localStorage.getItem(DRAFT_KEY);
			if (rawDraft) {
				const draft = JSON.parse(rawDraft);
				setSex(draft.sex);
				setAge(draft.age ?? "");
				setHeight(draft.height ?? "");
				setWeight(draft.weight ?? "");
				setWaist(draft.waist ?? "");
				setNeck(draft.neck ?? "");
				setHip(draft.hip ?? "");
				setAsian(Boolean(draft.asian));
			}
			const rawHistory = localStorage.getItem(HISTORY_KEY);
			if (rawHistory) {
				const parsed = JSON.parse(rawHistory);
				if (Array.isArray(parsed)) setHistory(parsed);
			}
		} catch {}
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		const draft = {
			sex,
			age,
			height,
			weight,
			waist,
			neck,
			hip,
			asian
		};
		localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
	}, [
		ready,
		sex,
		age,
		height,
		weight,
		waist,
		neck,
		hip,
		asian
	]);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
	}, [ready, history]);
	(0, import_react.useEffect)(() => {
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
	const assessment = (0, import_react.useMemo)(() => assess({
		sex,
		age: ageParsed.state === "ok" ? ageParsed.value : null,
		heightCm: heightParsed.state === "ok" ? heightParsed.cm : null,
		weightKg: weightParsed.state === "ok" ? weightParsed.value : null,
		waistCm: waistParsed.state === "ok" ? waistParsed.value : null,
		neckCm: neckParsed.state === "ok" ? neckParsed.value : null,
		hipCm: hipParsed.state === "ok" ? hipParsed.value : null,
		asianCutoffs: asian
	}), [
		sex,
		ageParsed,
		heightParsed,
		weightParsed,
		waistParsed,
		neckParsed,
		hipParsed,
		asian
	]);
	const heightError = heightParsed.state === "invalid" ? "Zentimeter oder Meter, zum Beispiel 168 oder 1,68." : assessment.fieldErrors.height;
	const ageError = ageParsed.state === "invalid" ? invalidMessage("Alter") : assessment.fieldErrors.age;
	const weightError = weightParsed.state === "invalid" ? invalidMessage("Gewicht") : assessment.fieldErrors.weight;
	const waistError = waistParsed.state === "invalid" ? invalidMessage("Taille") : assessment.fieldErrors.waist;
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
		const entry = {
			id: crypto.randomUUID(),
			at: (/* @__PURE__ */ new Date()).toISOString(),
			sex,
			age: ageParsed.state === "ok" ? ageParsed.value : null,
			heightCm: heightParsed.cm,
			weightKg: weightParsed.value,
			waistCm: waistParsed.state === "ok" ? waistParsed.value : null,
			neckCm: neckParsed.state === "ok" ? neckParsed.value : null,
			hipCm: hipParsed.state === "ok" ? hipParsed.value : null,
			bmi: assessment.bmi.value,
			fat: assessment.fat?.estimate ?? null
		};
		setHistory((current) => [entry, ...current].slice(0, 24));
		setNoted(true);
	}
	function applyEntry(entry) {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto w-full max-w-5xl px-4 py-8 pb-24 md:py-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "max-w-2xl",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tracking-widest text-primary uppercase",
						children: "Körpermaße"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-2 font-display text-5xl leading-none text-ink md:text-6xl",
						children: "Korpus"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 max-w-xl text-base text-muted",
						children: "Der BMI ist die Definition, gerechnet ohne versteckte Rundung. Der Fettanteil ist eine Schätzung aus Formeln, die gegen DXA und Luftverdrängung geprüft wurden — enger, sobald ein Bandmaß dazukommt."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8 grid items-start gap-6 lg:grid-cols-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "rounded-lg border border-line bg-surface p-5 shadow-card lg:col-span-2 md:p-6",
					onSubmit: (event) => event.preventDefault(),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium tracking-widest text-muted uppercase",
							children: "01 — Eingabe"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-2 font-display text-3xl",
							children: "Maße"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									id: "sex-label",
									className: "text-sm font-medium",
									children: "Geschlecht"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									role: "radiogroup",
									"aria-labelledby": "sex-label",
									className: "mt-1.5 grid grid-cols-2 gap-1 rounded-md bg-bg p-1",
									children: [["female", "Weiblich"], ["male", "Männlich"]].map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										role: "radio",
										"aria-checked": sex === value,
										onClick: () => setSex(value),
										className: clsx("h-11 rounded-sm text-sm font-medium", sex === value ? "bg-surface text-ink shadow-sm" : "text-muted"),
										children: label
									}, value))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1.5 text-xs text-muted",
									children: "Die Studien unterscheiden nur diese beiden Gruppen."
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 grid grid-cols-2 gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									id: "age",
									label: "Alter",
									unit: "Jahre",
									value: age,
									onChange: setAge,
									error: ageError
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									id: "height",
									label: "Größe",
									unit: "cm",
									value: height,
									onChange: setHeight,
									error: heightError,
									note: heightParsed.assumedMeters && heightParsed.cm != null ? `Als ${deFlex(heightParsed.cm, 1)} cm gelesen.` : void 0
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									id: "weight",
									label: "Gewicht",
									unit: "kg",
									value: weight,
									onChange: setWeight,
									error: weightError,
									className: "col-span-2"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
							className: "mt-6",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
									className: "text-sm font-medium",
									children: "Umfang für die genauere Schätzung"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-xs text-muted",
									children: "Optional. Stehend messen, Band anliegend, nicht einschnürend."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 grid grid-cols-2 gap-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											id: "waist",
											label: "Taille",
											unit: "cm",
											value: waist,
											onChange: setWaist,
											error: waistError
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											id: "neck",
											label: "Hals",
											unit: "cm",
											value: neck,
											onChange: setNeck,
											error: neckError
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											id: "hip",
											label: "Hüfte",
											unit: "cm",
											value: hip,
											onChange: setHip,
											error: hipError,
											note: sex === "female" ? "Für die Navy-Formel nötig." : sex === "male" ? "Für das Taille-Hüft-Verhältnis." : "Bei Frauen Teil der Navy-Formel.",
											className: "col-span-2"
										})
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
							className: "mt-4 rounded-md bg-bg px-3 py-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
								className: "text-sm font-medium",
								children: "Wie das Bandmaß sitzen soll"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
								className: "mt-2 list-disc space-y-1 pl-4 text-sm text-muted",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Taille nach normalem Ausatmen. Männer auf Nabelhöhe, Frauen an der schmalsten Stelle." }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Hals direkt unter dem Kehlkopf. Das Band fällt nach vorn leicht ab." }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Hüfte an der weitesten Stelle des Gesäßes, waagerecht." })
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 flex flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: loadExample,
								className: "h-11 rounded-md border border-line bg-surface px-3 text-sm font-medium",
								children: "Beispiel"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: clearFields,
								className: "h-11 rounded-md px-3 text-sm font-medium text-muted",
								children: "Felder leeren"
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "rounded-lg border border-line bg-surface p-5 shadow-card lg:col-span-3 md:p-6",
					"aria-live": "polite",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium tracking-widest text-muted uppercase",
							children: "02 — Ergebnis"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-2 font-display text-3xl",
							children: "Rechnung"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 grid grid-cols-2 gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-medium tracking-widest text-muted uppercase",
									children: "BMI"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: clsx("mt-2 font-display text-4xl tabular-nums leading-none md:text-5xl", !bmi && "text-faint"),
									children: bmi ? de(bmi.value, 2) : "–"
								}),
								bmi ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-3",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
										tone: bmi.tone,
										children: bmi.category
									})
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-sm text-muted",
									children: "Aus Größe und Gewicht."
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-medium tracking-widest text-muted uppercase",
									children: "Körperfett"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: clsx("mt-2 font-display text-4xl tabular-nums leading-none md:text-5xl", !fat && "text-faint"),
									children: fat ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [de(fat.estimate, 1), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-2xl",
										children: " %"
									})] }) : "–"
								}),
								fat ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 flex flex-col items-start gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
										tone: fat.tone,
										children: fat.category
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-sm text-muted tabular-nums",
										children: [
											"typisch ± ",
											de(fat.uncertainty, 1),
											" Punkte"
										]
									})]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-sm text-muted",
									children: "Schätzung, sobald Alter und Geschlecht da sind."
								})
							] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BmiScale, {
									value: bmi?.value ?? null,
									asian
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									role: "radiogroup",
									"aria-label": "BMI-Grenzwerte",
									className: "mt-3 grid grid-cols-2 gap-1 rounded-md bg-bg p-1",
									children: [[false, "WHO"], [true, "Asien, WHO 2004"]].map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										role: "radio",
										"aria-checked": asian === value,
										onClick: () => setAsian(value),
										className: clsx("h-11 rounded-sm px-2 text-sm font-medium", asian === value ? "bg-surface text-ink shadow-sm" : "text-muted"),
										children: label
									}, label))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 text-xs text-muted",
									children: bmi?.scaleNote ?? "WHO ab 25, oder die asiatischen Aktionsgrenzen ab 23."
								})
							]
						}),
						bmi && weightParsed.value != null && heightParsed.cm != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 border-t border-line pt-5 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "tabular-nums",
								children: [
									deFlex(weightParsed.value, 2),
									" kg bei ",
									deFlex(heightParsed.cm, 1),
									" cm =",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-medium",
										children: [de(bmi.value, 4), " kg/m²"]
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-muted",
								children: [
									weightSentence(weightParsed.value, bmi.healthyMinKg, bmi.healthyMaxKg),
									". Spanne",
									" ",
									de(bmi.healthyMinKg, 1),
									"–",
									de(bmi.healthyMaxKg, 1),
									" kg. Bei BMI 22,0 wären es ",
									de(bmi.weightAt22, 1),
									" kg."
								]
							})]
						}) : null,
						fat ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 border-t border-line pt-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex h-3 overflow-hidden rounded-full bg-primary",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "h-full bg-warn",
										style: { width: `${Math.min(fat.estimate, 100)}%` }
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-2 flex justify-between text-sm tabular-nums",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [de(fat.fatMassKg, 1), " kg Fett"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-muted",
										children: [de(fat.leanMassKg, 1), " kg fettfrei"]
									})]
								}),
								spreadLo != null && spreadHi != null && included.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-2 text-sm text-muted tabular-nums",
									children: [
										"Spanne der Verfahren ",
										de(spreadLo, 1),
										"–",
										de(spreadHi, 1),
										" %. ",
										fat.categoryNote,
										"."
									]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-2 text-sm text-muted",
									children: [fat.categoryNote, "."]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
									className: "mt-4 grid grid-cols-2 gap-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-md bg-bg px-3 py-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
												className: "text-xs text-muted",
												children: "Fettmasse"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
												className: "mt-1 font-display text-2xl tabular-nums leading-none",
												children: [de(fat.fatMassKg, 1), " kg"]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-md bg-bg px-3 py-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
												className: "text-xs text-muted",
												children: "Fettfreie Masse"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
												className: "mt-1 font-display text-2xl tabular-nums leading-none",
												children: [de(fat.leanMassKg, 1), " kg"]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-md bg-bg px-3 py-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
													className: "text-xs text-muted",
													children: "FFMI"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
													className: "mt-1 font-display text-2xl tabular-nums leading-none",
													children: de(fat.ffmi, 1)
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "mt-1 text-xs text-muted",
													children: "Fettfreie Masse je m²."
												})
											]
										}),
										assessment.waistToHeight ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-md bg-bg px-3 py-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
													className: "text-xs text-muted",
													children: "Taille / Größe"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
													className: "mt-1 font-display text-2xl tabular-nums leading-none",
													children: de(assessment.waistToHeight.value, 2)
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "mt-1 text-xs text-muted",
													children: assessment.waistToHeight.detail
												})
											]
										}) : null,
										assessment.waistToHip ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-md bg-bg px-3 py-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
													className: "text-xs text-muted",
													children: "Taille / Hüfte"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
													className: "mt-1 font-display text-2xl tabular-nums leading-none",
													children: de(assessment.waistToHip.value, 2)
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "mt-1 text-xs text-muted",
													children: assessment.waistToHip.detail
												})
											]
										}) : null
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "mt-5 flex flex-col gap-3",
									children: [...fat.methods].sort((a, b) => Number(b.inEstimate) - Number(a.inEstimate)).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-baseline justify-between gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-sm font-medium",
												children: [row.name, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "ml-2 text-xs font-normal text-muted",
													children: row.inEstimate ? "in der Schätzung" : "nur Vergleich"
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-sm tabular-nums",
												children: [de(row.value, 1), " %"]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mt-1.5 h-1.5 overflow-hidden rounded-full bg-line",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: clsx("h-full rounded-full", row.inEstimate ? "bg-primary" : "bg-faint"),
												style: { width: `${Math.min(100, row.value / 50 * 100)}%` }
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 text-xs text-muted",
											children: row.detail
										})
									] }, row.id))
								})
							]
						}) : null,
						assessment.hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-5 rounded-md bg-primary-soft px-3 py-3 text-sm text-primary",
							children: assessment.hint
						}) : null,
						assessment.warnings.map((warning) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 rounded-md bg-warn-soft px-3 py-3 text-sm text-warn",
							children: warning
						}, warning)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 flex flex-wrap items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: remember,
								disabled: !bmi,
								className: "h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-fg disabled:opacity-40",
								children: noted ? "Gemerkt" : "Messung merken"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted",
								children: "Bleibt in diesem Browser."
							})]
						}),
						bmi ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
							className: "mt-4 rounded-md bg-bg px-3 py-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
								className: "text-sm font-medium",
								children: "Rechenweg"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 space-y-2 text-sm text-muted",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
										"BMI = Gewicht geteilt durch Größe im Quadrat. Angezeigt auf zwei Stellen, gerechnet mit der vollen Zahl (",
										bmi ? de(bmi.value, 4) : "",
										")."
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Der Fettanteil ist das gewichtete Mittel der markierten Verfahren: CUN-BAE mit Gewicht 1, Relative Fat Mass mit 1,2, US Navy mit 1,45. Deurenberg nutzt dieselben Grunddaten wie CUN-BAE und wird deshalb nicht ein zweites Mal gemittelt." }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Die Angabe „typisch ± …“ ist eine übliche Abweichung gegenüber Referenzverfahren, keine Garantie. Ein DXA-Scan bleibt genauer. Kein Medizinprodukt und kein Ersatz für eine Untersuchung." })
								]
							})]
						}) : null
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-3xl",
					children: "Verlauf"
				}), history.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "Noch nichts gemerkt. Eine Messung bleibt nur auf diesem Gerät."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface",
					children: history.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-2 px-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => applyEntry(entry),
							className: "min-h-11 flex-1 py-3 text-left",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "block text-sm font-medium tabular-nums",
								children: [
									"BMI ",
									de(entry.bmi, 2),
									entry.fat != null ? ` · ${de(entry.fat, 1)} % Fett` : ""
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "block text-xs text-muted",
								children: [
									new Date(entry.at).toLocaleString("de-DE", {
										day: "2-digit",
										month: "short",
										year: "numeric",
										hour: "2-digit",
										minute: "2-digit"
									}),
									" · ",
									deFlex(entry.weightKg),
									" kg, ",
									deFlex(entry.heightCm),
									" cm"
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Messung löschen",
							onClick: () => setHistory((current) => current.filter((item) => item.id !== entry.id)),
							className: "grid size-11 place-items-center rounded-md text-muted",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {
								className: "size-4",
								"aria-hidden": "true"
							})
						})]
					}, entry.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "mt-10 max-w-3xl text-xs leading-relaxed text-muted",
				children: "BMI nach WHO: kg/m². Fettanteil nach CUN-BAE (Gómez-Ambrosi et al., Diabetes Care 2012), Relative Fat Mass (Woolcott & Bergman, Scientific Reports 2018) und US Navy (Hodgdon & Beckett, 1984, Siri-Gleichung). Einordnung des Fetts in Anlehnung an Gallagher et al., American Journal of Clinical Nutrition 2000. Nicht für Schwangere. Unter 18 Jahren keine Fettschätzung."
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Korpus, {});
}
//#endregion
export { Home as component };
