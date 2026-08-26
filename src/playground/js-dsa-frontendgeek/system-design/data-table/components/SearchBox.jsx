import React, { useState } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useEffect } from 'react';

export function SearchBox({ onSearch, placeholder = 'Search...' }) {
  const [value, setValue] = useState('');
  const debounced = useDebouncedValue(value, 300);

  useEffect(() => {
    onSearch(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <input
      className="dt-search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
    />
  );
}
