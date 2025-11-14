
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { get, set } from 'idb-keyval';

export function useIdb<T>(key: string, initialValue: T): [T | null, (value: T | null | ((val: T) => T | null)) => void, boolean] {
  const [storedValue, setStoredValue] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get(key).then(val => {
      if (val !== undefined) {
        setStoredValue(val);
      } else {
        setStoredValue(initialValue);
        set(key, initialValue);
      }
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load from IndexedDB", err);
      setStoredValue(initialValue);
      setLoading(false);
    });
  }, [key, initialValue]);

  const setValue = useCallback((value: T | null | ((val: T) => T | null)) => {
    setStoredValue(currentValue => {
        const valueToStore = value instanceof Function && currentValue ? value(currentValue) : value;
        if (valueToStore !== null) {
          set(key, valueToStore);
        }
        return valueToStore as T;
    });
  }, [key]);

  return [storedValue, setValue, loading];
}
