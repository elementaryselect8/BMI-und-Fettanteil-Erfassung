import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assess,
  bmiValue,
  cunBae,
  deurenberg,
  navyBodyFat,
  parseHeightCm,
  relativeFatMass,
} from "./metrics.ts";

describe("body metrics", () => {
  it("computes BMI from kg and cm without intermediate rounding", () => {
    assert.ok(Math.abs(bmiValue(80, 180) - 800_000 / 32_400) < 1e-12);
  });

  it("matches the published CUN-BAE coefficients", () => {
    assert.ok(Math.abs(cunBae(25, 40, "male") - 23.432) < 1e-9);
    assert.ok(Math.abs(cunBae(25, 40, "female") - 35.521) < 1e-9);
  });

  it("matches Deurenberg 1991", () => {
    assert.ok(Math.abs(deurenberg(25, 40, "male") - 23) < 1e-12);
    assert.ok(Math.abs(deurenberg(25, 40, "female") - 33.8) < 1e-12);
  });

  it("matches the metric Navy / Siri equation", () => {
    const male = navyBodyFat(180, 90, 40, null, "male");
    assert.ok(male != null && Math.abs(male - 18.366) < 0.01);
    const female = navyBodyFat(165, 70, 32, 95, "female");
    assert.ok(female != null && Math.abs(female - 24.855) < 0.01);
  });

  it("matches Woolcott relative fat mass", () => {
    assert.ok(Math.abs(relativeFatMass(180, 90, "male") - 24) < 1e-12);
    assert.ok(Math.abs(relativeFatMass(165, 80, "female") - 34.75) < 1e-12);
  });

  it("reads metres as centimetres", () => {
    const parsed = parseHeightCm("1,78");
    assert.equal(parsed.assumedMeters, true);
    assert.equal(parsed.cm, 178);
  });

  it("blends independent methods and keeps Deurenberg out of the average", () => {
    const result = assess({
      sex: "male",
      age: 35,
      heightCm: 180,
      weightKg: 80,
      waistCm: 90,
      neckCm: 40,
      hipCm: null,
      asianCutoffs: false,
    });
    assert.ok(result.bmi);
    assert.ok(result.fat);
    const used = result.fat.methods.filter((row) => row.inEstimate).map((row) => row.id);
    assert.deepEqual(used.sort(), ["cun-bae", "navy", "rfm"]);
    assert.equal(
      result.fat.methods.some((row) => row.id === "deurenberg" && !row.inEstimate),
      true,
    );
    assert.ok(result.fat.uncertainty <= 2.7);
    assert.ok(result.fat.estimate > 15 && result.fat.estimate < 30);
  });

  it("does not estimate fat for minors", () => {
    const result = assess({
      sex: "female",
      age: 16,
      heightCm: 165,
      weightKg: 55,
      waistCm: null,
      neckCm: null,
      hipCm: null,
      asianCutoffs: false,
    });
    assert.ok(result.bmi);
    assert.equal(result.fat, null);
    assert.ok(result.warnings.length > 0);
  });

  it("does not call a muscular waist an overweight BMI", () => {
    const result = assess({
      sex: "male",
      age: 30,
      heightCm: 180,
      weightKg: 92,
      waistCm: 80,
      neckCm: 39,
      hipCm: null,
      asianCutoffs: false,
    });
    assert.equal(result.bmi?.adjusted, true);
    assert.equal(result.bmi?.whoCategory, "Übergewicht");
    assert.equal(result.fat?.build === "trained" || result.fat?.build === "muscular", true);
    const cun = result.fat?.methods.find((row) => row.id === "cun-bae");
    assert.ok(cun && result.fat && result.fat.estimate < cun.value);
  });

  it("does not excuse a high waist as muscle", () => {
    const result = assess({
      sex: "male",
      age: 30,
      heightCm: 180,
      weightKg: 92,
      waistCm: 108,
      neckCm: 40,
      hipCm: null,
      asianCutoffs: false,
      buildChoice: "muscular",
    });
    assert.equal(result.bmi?.adjusted, false);
    assert.equal(result.bmi?.category, "Übergewicht");
    assert.equal(result.fat?.build, "active");
  });

  it("lowers a BMI-only fat estimate when the person is muscular", () => {
    const plain = assess({
      sex: "male",
      age: 30,
      heightCm: 180,
      weightKg: 90,
      waistCm: null,
      neckCm: null,
      hipCm: null,
      asianCutoffs: false,
    });
    const muscular = assess({
      sex: "male",
      age: 30,
      heightCm: 180,
      weightKg: 90,
      waistCm: null,
      neckCm: null,
      hipCm: null,
      asianCutoffs: false,
      buildChoice: "muscular",
    });
    assert.ok(plain.fat && muscular.fat);
    assert.ok(Math.abs(plain.fat.estimate - muscular.fat.estimate - 4.5) < 0.05);
    assert.equal(muscular.fat.correctionPp, 4.5);
  });
});
