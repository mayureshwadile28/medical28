
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

// File System Access API types for broader browser support
declare global {
  interface Window {
    showOpenFilePicker(options?: any): Promise<[FileSystemFileHandle]>;
    showSaveFilePicker(options?: any): Promise<FileSystemFileHandle>;
  }
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
  getFile(): Promise<File>;
  name: string;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: any): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}


const verifyPermission = async (fileHandle: FileSystemFileHandle, readWrite: boolean): Promise<boolean> => {
    const options: any = {};
    if (readWrite) {
      options.mode = 'readwrite';
    }
    if ((await fileHandle.queryPermission(options)) === 'granted') {
      return true;
    }
    if ((await fileHandle.requestPermission(options)) === 'granted') {
      return true;
    }
    return false;
};

// Custom hook to manage data persistence using the File System Access API
export function useFileSystemAccess<T>(key: string, initialValue: T): [T, (value: T | null | ((val: T) => T | null)) => void, boolean, () => void, string] {
  const [loading, setLoading] = useState(true);
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [fileName, setFileName] = useState('');
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  
  const loadFile = useCallback(async () => {
    setLoading(true);
    try {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
            multiple: false,
        });

        const hasPermission = await verifyPermission(fileHandle, true);
        if (!hasPermission) {
            console.error("Permission to read/write file denied.");
            setLoading(false);
            return;
        }

        fileHandleRef.current = fileHandle;
        setFileName(fileHandle.name);
        const file = await fileHandle.getFile();
        const contents = await file.text();
        if (contents) {
            setStoredValue(JSON.parse(contents));
        }
        localStorage.setItem(`${key}-handle`, 'true'); // Flag that we have a handle
    } catch (err) {
        if ((err as Error).name !== 'AbortError') {
            console.error("Error loading file:", err);
        }
    } finally {
        setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    // This effect runs once on mount to check if we should prompt the user.
    const handleExists = localStorage.getItem(`${key}-handle`);
    if (!handleExists) {
        // No handle stored, we need to prompt the user.
        // The UI will show the button to trigger loadFile.
        setLoading(false);
    } else {
        // We *should* have a handle, but since we can't store the handle itself,
        // we have to re-prompt. This flow is a limitation of the API's security model.
        // The UI should prompt the user to re-select their data file.
        setLoading(false);
    }
  }, [key]);

  const setValue = useCallback((value: T | null | ((val: T) => T | null)) => {
    setStoredValue(currentValue => {
        const valueToStore = value instanceof Function ? value(currentValue) : value;

        if (fileHandleRef.current && valueToStore) {
            const writeToFile = async () => {
                try {
                    const writable = await fileHandleRef.current!.createWritable();
                    await writable.write(JSON.stringify(valueToStore, null, 2));
                    await writable.close();
                } catch(err) {
                    console.error("Error saving to file:", err);
                }
            };
            writeToFile();
        }
        
        return valueToStore as T;
    });
  }, []);

  return [storedValue, setValue, loading, loadFile, fileName];
}
