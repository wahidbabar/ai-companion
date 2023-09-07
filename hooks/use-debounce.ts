import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay?: number): T{
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay || 500);
        return () => {
            clearTimeout(timer)
        }
    }, [value, delay])

    // What actually happens is that whenever a dependency in the useEffect changes, React re-runs the useEffect function 

    return debouncedValue;
}