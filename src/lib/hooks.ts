
'use client';
import { useState, useEffect, useCallback } from 'react';

// This hook is used for simple, non-critical UI state like the license key.
// It is NOT suitable for large datasets, which are now handled by the Firestore-backed AppService.
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | null | ((val: T) => T | null)) => void, boolean] {
  const [loading, setLoading] = useState(true);
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [key]);

  const setValue = useCallback((value: T | null | ((val: T) => T | null)) => {
    try {
        setStoredValue(currentValue => {
            const valueToStore = value instanceof Function ? value(currentValue) : value;
            if (valueToStore === null) {
                window.localStorage.removeItem(key);
            } else {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
            return valueToStore as T; // Type assertion
        });
    } catch (error) {
        console.error(error);
    }
}, [key]);

  return [storedValue, setValue, loading];
}
