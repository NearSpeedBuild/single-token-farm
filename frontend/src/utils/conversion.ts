export const formatValueInDecimals = (value: string, decimals: number) => {
  // Convert the value to a string
  const valueStr = value?.toString();

  // If the number of decimals is greater than the length of the value, add leading zeros
  if (decimals >= valueStr.length) {
    const leadingZeros = "0.".padEnd(decimals - valueStr.length + 2, "0");
    return leadingZeros + valueStr;
  }

  // Insert the decimal point at the correct position
  const integerPart = valueStr.slice(0, valueStr.length - decimals);
  const fractionalPart = valueStr.slice(valueStr.length - decimals);

  return integerPart + "." + fractionalPart;
};

export function formatNumberWithSuffix(num: number): string {
  if (isNaN(num)) {
    return "0";
  }
  if (num == 0) {
    return "0";
  }
  if (num < 0.01) {
    return "<0.01";
  }

  if (num < 1000) {
    return num?.toFixed(2);
  }

  const suffixes: string[] = [
    "",
    "K",
    "M",
    "B",
    "T",
    "Q",
    "Qu",
    "S",
    "O",
    "N",
    "D",
    "UD",
    "DD",
    "TD",
    "QD",
    "QuD",
    "SD",
    "OD",
    "ND",
  ];
  const magnitude: number = Math.floor(Math.log10(num) / 3);

  // Limiting to the length of suffixes array - 1 to avoid undefined access
  const suffix: string = suffixes[Math.min(magnitude, suffixes.length - 1)];

  const scaledNumber: number = num / Math.pow(1000, magnitude);

  return scaledNumber.toFixed(2) + suffix;
}

export const toNonDivisibleNumber = (
  decimals: number,
  number: string,
): string => {
  if (decimals === null || decimals === undefined) return number;
  const [wholePart, fracPart = ""] = number.split(".");

  return `${wholePart}${fracPart.padEnd(decimals, "0").slice(0, decimals)}`
    .replace(/^0+/, "")
    .padStart(1, "0");
};

export const toReadableNumber = (
  decimals: number,
  number: string = "0",
): string => {
  if (!decimals) return number;

  const wholeStr = number.substring(0, number.length - decimals) || "0";
  const fractionStr = number
    .substring(number.length - decimals)
    .padStart(decimals, "0")
    .substring(0, decimals);

  return `${wholeStr}.${fractionStr}`.replace(/\.?0+$/, "");
};

export function formatWithCommas(value: string): string {
  const pattern = /(-?\d+)(\d{3})/;
  while (pattern.test(value)) {
    value = value.replace(pattern, "$1,$2");
  }
  return value;
}

export const toPrecision = (
  number: string,
  precision: number,
  withCommas: boolean = false,
  atLeastOne: boolean = true,
): string => {
  if (typeof number === "undefined") return "0";

  const [whole, decimal = ""] = number.split(".");

  let str = `${withCommas ? formatWithCommas(whole) : whole}.${decimal.slice(
    0,
    precision,
  )}`.replace(/\.$/, "");
  if (atLeastOne && Number(str) === 0 && str.length > 1) {
    var n = str.lastIndexOf("0");
    str = str.slice(0, n) + str.slice(n).replace("0", "1");
  }

  return str;
};

export const formatWithoutTrailingZeros = (value: string): string => {
  if (!value) return "0";
  if (!value.includes(".")) return value;
  return value.replace(/\.?0+$/, "").replace(/\.$/, "");
};
