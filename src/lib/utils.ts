import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getDisplayQuantity = (item: { quantity?: string | number, unitsPerPack?: number, unitName?: string }) => {
    if (item.unitsPerPack && item.unitName) {
        return `${item.quantity} (${item.unitsPerPack} ${item.unitName}/pack)`;
    }
    return item.quantity;
};
