// src/lib/currency.ts
'use client';

// A client-side utility to ensure consistent currency formatting.
// Using Intl.NumberFormat is the standard and most reliable way to format currency.

const formatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatToINR(amount: number): string {
  return formatter.format(amount);
}
