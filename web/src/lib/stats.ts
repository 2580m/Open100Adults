export const RANKS = ["SS", "S", "A", "B+", "B", "C", "D", "E"] as const;
export type Rank = (typeof RANKS)[number];

const RANK_THRESHOLDS: Record<Rank, number> = {
  SS: 70,
  S: 65,
  A: 60,
  "B+": 55,
  B: 45,
  C: 40,
  D: 35,
  E: -Infinity,
};

/** Standard normal CDF (same approximation as the production bundle). */
export function normalCdf(z: number): number {
  const a = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * a);
  const erf =
    1 -
    t *
      (0.254829592 +
        t *
          (-0.284496736 +
            t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) *
      Math.exp(-a * a);
  return 0.5 * (1 + (z < 0 ? -erf : erf));
}

export function tOf(z: number): number {
  return 50 + 10 * z;
}

export function rankOf(t: number): Rank {
  for (const rank of RANKS) {
    if (t >= RANK_THRESHOLDS[rank]) return rank;
  }
  return "E";
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function fromCm(value: number, unit: "cm" | "in"): number {
  return unit === "in" ? value / 2.54 : value;
}

export function toCm(value: number, unit: "cm" | "in"): number {
  return unit === "in" ? value * 2.54 : value;
}

export interface PercentileResult {
  z: number;
  t: number;
  pct: number;
  rank: Rank;
  top: boolean;
  /** Distance from the middle: the "top X%" / "bottom X%" number. */
  share: number;
  oneIn: number;
}

function percentileFromZ(z: number): PercentileResult {
  const t = tOf(z);
  const pct = 100 * normalCdf(z);
  const top = pct >= 50;
  const share = Math.max(0.1, top ? 100 - pct : pct);
  return {
    z,
    t,
    pct,
    rank: rankOf(t),
    top,
    share,
    oneIn: Math.max(1, Math.round(100 / share)),
  };
}

/* ------------------------------------------------------------------ */
/* Penis size                                                          */
/* ------------------------------------------------------------------ */

export const SIZE_STATES = ["e", "f"] as const;
export type SizeState = (typeof SIZE_STATES)[number];

const SIZE_BASELINE: Record<
  SizeState,
  { len: { mean: number; sd: number }; gir: { mean: number; sd: number } }
> = {
  e: { len: { mean: 13.12, sd: 1.66 }, gir: { mean: 11.66, sd: 1.1 } },
  f: { len: { mean: 9.16, sd: 1.57 }, gir: { mean: 9.31, sd: 0.9 } },
};

const SIZE_RANGE = {
  len: { min: 3, max: 30 },
  gir: { min: 3, max: 25 },
};

export interface SizeResult extends PercentileResult {
  state: SizeState;
  len: { cm: number; z: number; t: number; pct: number };
  gir: { cm: number; z: number; t: number; pct: number };
}

export function computeSize(
  state: SizeState,
  lengthCm: number,
  girthCm: number,
): SizeResult | null {
  const inRange = (key: "len" | "gir", value: number) =>
    Number.isFinite(value) &&
    value >= SIZE_RANGE[key].min &&
    value <= SIZE_RANGE[key].max;

  if (!inRange("len", lengthCm) || !inRange("gir", girthCm)) return null;

  const measure = (key: "len" | "gir", value: number) => {
    const baseline = SIZE_BASELINE[state][key];
    const z = (value - baseline.mean) / baseline.sd;
    return { cm: value, z, t: tOf(z), pct: 100 * normalCdf(z) };
  };

  const len = measure("len", lengthCm);
  const gir = measure("gir", girthCm);
  const t = (len.t + gir.t) / 2;
  const pct = 100 * normalCdf((t - 50) / 10);
  const top = pct >= 50;
  const share = Math.max(0.1, top ? 100 - pct : pct);

  return {
    state,
    len,
    gir,
    z: (t - 50) / 10,
    t,
    pct,
    rank: rankOf(t),
    top,
    share,
    oneIn: Math.max(1, Math.round(100 / share)),
  };
}

/* ------------------------------------------------------------------ */
/* Stamina                                                             */
/* ------------------------------------------------------------------ */

export function computeStamina(minutes: number): PercentileResult | null {
  if (!(Number.isFinite(minutes) && minutes >= 0.1 && minutes <= 120)) {
    return null;
  }
  const z = (Math.log(minutes) - Math.log(5.4)) / 0.71;
  return percentileFromZ(z);
}

/* ------------------------------------------------------------------ */
/* Body count (Natsal-3)                                               */
/* ------------------------------------------------------------------ */

export const AGE_BANDS = ["all", "16", "25", "35", "45", "55", "65"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

interface AgeBandData {
  bins: [number, number, number, number, number, number];
  median: number;
  iqr: [number, number];
  mean: number;
  n: number;
}

export const NATSAL3_MEN: Record<AgeBand, AgeBandData> = {
  all: { bins: [5.5, 13.7, 8.4, 15, 23.5, 33.9], median: 6, iqr: [2, 12], mean: 14.1, n: 6293 },
  16: { bins: [19.8, 15.4, 11.8, 15.7, 17.6, 19.6], median: 3, iqr: [1, 7], mean: 6.5, n: 1729 },
  25: { bins: [5.2, 12.6, 6.7, 14.3, 23.5, 37.8], median: 6, iqr: [3, 15], mean: 13.7, n: 1525 },
  35: { bins: [1.5, 11.8, 5.7, 12.4, 26.5, 42.1], median: 8, iqr: [4, 18], mean: 14.3, n: 806 },
  45: { bins: [2, 8.8, 7.2, 13.6, 25.4, 43.1], median: 8, iqr: [4, 20], mean: 17.5, n: 794 },
  55: { bins: [2.2, 15.3, 9.3, 17.6, 23.9, 31.7], median: 5, iqr: [2, 11], mean: 20.1, n: 772 },
  65: { bins: [1.8, 22.9, 11.2, 18.4, 23.4, 22.3], median: 4, iqr: [2, 8], mean: 12.1, n: 667 },
};

/** Inverse normal CDF (Acklam's approximation, as shipped upstream). */
function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  if (p < 0.02425) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((-0.007784894002430293 * q - 0.3223964580411365) * q - 2.400758277161838) * q -
        2.549732539343734) *
        q +
        4.374664141464968) *
        q +
        2.938163982698783) /
      ((((0.007784695709041462 * q + 0.3224671290700398) * q + 2.445134137142996) * q +
        3.754408661907416) *
        q +
        1)
    );
  }

  if (p > 0.97575) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(
        (((((-0.007784894002430293 * q - 0.3223964580411365) * q - 2.400758277161838) * q -
          2.549732539343734) *
          q +
          4.374664141464968) *
          q +
          2.938163982698783) /
        ((((0.007784695709041462 * q + 0.3224671290700398) * q + 2.445134137142996) * q +
          3.754408661907416) *
          q +
          1)
      )
    );
  }

  const q = p - 0.5;
  const r = q * q;
  return (
    ((((((-39.69683028665376 * r + 220.9460984245205) * r - 275.9285104469687) * r +
      138.357751867269) *
      r -
      30.66479806614716) *
      r +
      2.506628277459239) *
      q) /
    (((((-54.47609879822406 * r + 161.5858368580409) * r - 155.6989798598866) * r +
      66.80131188771972) *
      r -
      13.28068155288572) *
      r +
      1)
  );
}

interface FittedBand {
  p: number[];
  mu: number;
  sigma: number;
}

const FITTED: Record<AgeBand, FittedBand> = Object.fromEntries(
  AGE_BANDS.map((band) => {
    const bins = NATSAL3_MEN[band].bins;
    const total = bins.reduce((sum, bin) => sum + bin, 0);
    const p = bins.map((bin) => bin / total);
    const nonZero = 1 - p[0];
    const cumulative = [
      p[1],
      p[1] + p[2],
      p[1] + p[2] + p[3],
      p[1] + p[2] + p[3] + p[4],
    ];
    const logMidpoints = [1.5, 2.5, 4.5, 9.5].map(Math.log);
    const zScores = cumulative.map((value) => normalQuantile(value / nonZero));
    const meanLog = logMidpoints.reduce((sum, value) => sum + value, 0) / logMidpoints.length;
    const meanZ = zScores.reduce((sum, value) => sum + value, 0) / zScores.length;
    let covariance = 0;
    let variance = 0;
    logMidpoints.forEach((value, index) => {
      covariance += (value - meanLog) * (zScores[index] - meanZ);
      variance += (value - meanLog) ** 2;
    });
    const sigma = 1 / (covariance / variance);
    return [band, { p, mu: meanLog - meanZ * sigma, sigma }];
  }),
) as Record<AgeBand, FittedBand>;

/** Cumulative share of men with at most `n` partners in the selected band. */
function partnersCdf(n: number, band: AgeBand): number {
  if (n < 0) return 0;
  const { p, mu, sigma } = FITTED[band];
  const phi = (value: number) => normalCdf((Math.log(value) - mu) / sigma);

  if (n === 0) return p[0];
  if (n <= 2) return p[0] + p[1] + (n === 2 ? p[2] : 0);

  const throughTwo = p[0] + p[1] + p[2];
  if (n <= 4) {
    return (
      throughTwo +
      p[3] * ((phi(n + 0.5) - phi(2.5)) / (phi(4.5) - phi(2.5)))
    );
  }

  const throughFour = throughTwo + p[3];
  if (n <= 9) {
    return (
      throughFour +
      p[4] * ((phi(n + 0.5) - phi(4.5)) / (phi(9.5) - phi(4.5)))
    );
  }

  return 1 - (p[5] * (1 - phi(n + 0.5))) / (1 - phi(9.5));
}

export interface PartnersResult extends PercentileResult {
  n: number;
  age: AgeBand;
  /** Share of men who report exactly this count, in percent. */
  same: number;
}

export function computePartners(count: number, age: AgeBand = "all"): PartnersResult | null {
  if (!Number.isInteger(count) || count < 0 || count > 999) return null;
  if (!AGE_BANDS.includes(age)) return null;

  const lower = partnersCdf(count - 1, age);
  const upper = partnersCdf(count, age);
  const fraction = Math.min(0.99999, Math.max(0.00001, lower + (upper - lower) / 2));
  const z = normalQuantile(fraction);
  const t = tOf(z);
  const top = fraction >= 0.5;
  const share = Math.max(0.1, 100 * (top ? 1 - fraction : fraction));

  return {
    n: count,
    age,
    z,
    t,
    pct: fraction * 100,
    rank: rankOf(t),
    top,
    share,
    oneIn: Math.max(1, Math.round(100 / share)),
    same: (upper - lower) * 100,
  };
}
