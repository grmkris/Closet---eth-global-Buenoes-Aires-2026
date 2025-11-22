import { useEffect, useState } from "react";

/**
 * Debounces a value by the specified delay in milliseconds
 * Useful for search inputs to avoid excessive API calls or filtering
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(timer);
		};
	}, [value, delay]);

	return debouncedValue;
}
