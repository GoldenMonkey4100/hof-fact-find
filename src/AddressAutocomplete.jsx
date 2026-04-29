import { useEffect, useRef } from 'react';

/**
 * Australian address autocomplete backed by Google Places.
 * Requires the Google Maps JS SDK with the "places" library loaded in index.html.
 * Falls back to a plain text input if the SDK isn't available.
 */
const AddressAutocomplete = ({ value, onChange, placeholder, style, className }) => {
  const inputRef = useRef(null);

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
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || 'Start typing an address…'}
      style={style}
      className={className}
      autoComplete="off"
    />
  );
};

export default AddressAutocomplete;
