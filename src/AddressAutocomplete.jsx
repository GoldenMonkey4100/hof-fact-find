import { useEffect, useRef } from 'react';

/**
 * Australian address autocomplete backed by Google Places.
 *
 * Uses an UNCONTROLLED input with imperative DOM updates to avoid the
 * React controlled-input conflict where React re-renders overwrite the
 * value that Google Places is trying to set, corrupting the dropdown.
 *
 * - User typing  → fires onChange on every keystroke (parent can track if needed)
 * - Place selected → fires onChange with formatted_address
 * - External value update (e.g. AI pre-fill) → imperatively sets DOM value
 *   when the field is not focused
 */
const AddressAutocomplete = ({ value, onChange, placeholder, style, className }) => {
  const inputRef   = useRef(null);
  const isFocused  = useRef(false);

  // Sync external value changes into the DOM (e.g. AI pre-fill from DL scan)
  // but only when the user isn't actively typing so we don't interrupt them.
  useEffect(() => {
    if (inputRef.current && !isFocused.current) {
      inputRef.current.value = value || '';
    }
  }, [value]);

  // Initialise Google Places Autocomplete once on mount.
  useEffect(() => {
    if (!window.google?.maps?.places || !inputRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'au' },
      fields: ['formatted_address']
    });

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place?.formatted_address) onChange(place.formatted_address);
    });

    return () => window.google.maps.event.removeListener(listener);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={value}
      onFocus={() => { isFocused.current = true; }}
      onBlur={() => { isFocused.current = false; }}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || 'Start typing an address…'}
      style={style}
      className={className}
      autoComplete="off"
    />
  );
};

export default AddressAutocomplete;
