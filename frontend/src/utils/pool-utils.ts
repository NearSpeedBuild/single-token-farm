import BigNumber from "bignumber.js";
import { toReadableNumber, toPrecision } from "./conversion";

export const readableValue = (decimal: number, amount: BigNumber) => {
  return toPrecision(
    toReadableNumber(
      decimal,
      amount.toNumber().toLocaleString("fullwide", { useGrouping: false }),
    ),
    2,
  );
};
