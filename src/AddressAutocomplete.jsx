import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Australian address autocomplete using Google Places AutocompleteService
 * (data-only API — no pac-container widget injected into the DOM).
 *
 * Renders a fully custom dropdown, avoiding all pac-container CSS conflicts
 * and the React controlled-input race condition that caused the ! icon bug.
 */
const AddressAutocomplete = ({ value, onChange, placeholder, style, className }) => {
  const [inputVal,   setInputVal]   = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open,       setOpen]       = useState(false);
  const [activeIdx,  setActiveIdx]  = useState(-1);

  const containerRef = useRef(null);
  const serviceRef   = useRef(null);
  const debounceRef  = useRef(null);

  // Keep inputVal in sync with external changes (AI pre-fill etc.)
  useEffect(() => { setInputVal(value || ''); }, [value]);

  // Init AutocompleteService.
  // When Google Maps is loaded with loading=async (the modern loader), the places
  // namespace is NOT pre-populated — you must call importLibrary('places') instead.
  // This effect handles both the new and legacy loaders.
  useEffect(() => {
    let cancelled = false;

    const loadService = async () => {
      // Wait up to 10 s for window.google.maps to appear
      let attempts = 0;
      while (!window.google?.maps && attempts < 40) {
        await new Promise(r => setTimeout(r, 250));
        attempts++;
      }
      if (cancelled || !window.google?.maps) {
        console.warn('[AddressAutocomplete] Google Maps SDK did not load in time');
        return;
      }

      try {
        let AutocompleteService;
        if (typeof window.google.maps.importLibrary === 'function') {
          // New async loader — importLibrary is the correct path
          const lib = await window.google.maps.importLibrary('places');
          AutocompleteService = lib.AutocompleteService;
        } else if (window.google.maps.places?.AutocompleteService) {
          // Legacy synchronous loader fallback
          AutocompleteService = window.google.maps.places.AutocompleteService;
        }
        if (!cancelled && AutocompleteService) {
          serviceRef.current = new AutocompleteService();
        }
      } catch (e) {
        if (!cancelled) console.warn('[AddressAutocomplete] Places init error:', e);
      }
    };

    loadService();
    return () => { cancelled = true; };
  }, []);

  const fetchSuggestions = useCallback((input) => {
    if (!serviceRef.current || !input || input.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    serviceRef.current.getPlacePredictions(
      { input, types: ['address'], componentRestrictions: { country: 'au' } },
      (predictions, status) => {
        if (status === 'OK' && predictions?.length) {
          setSuggestions(predictions);
          setOpen(true);
          setActiveIdx(-1);
        } else {
          setSuggestions([]);
          setOpen(false);
          if (status !== 'ZERO_RESULTS') console.warn('[AddressAutocomplete] Places status:', status);
        }
      }
    );
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setInputVal(val);
    onChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (s) => {
    setInputVal(s.description);
    setSuggestions([]);
    setOpen(false);
    onChange(s.description);
  };

  const handleKeyDown = (e) => {
    if (!open || !suggestions.length) return;
    if      (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); handleSelect(suggestions[activeIdx]); }
    else if (e.key === 'Escape')    { setOpen(false); }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={inputVal}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder || 'Start typing an address…'}
        style={style}
        className={className}
        autoComplete="nope"
      />

      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          zIndex: 99999, background: 'white',
          border: '1px solid var(--border-primary)',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          marginTop: '2px', overflow: 'hidden',
          maxHeight: '220px', overflowY: 'auto'
        }}>
          {suggestions.map((s, i) => {
            const main      = s.structured_formatting?.main_text || s.description;
            const secondary = s.structured_formatting?.secondary_text || '';
            return (
              <div
                key={s.place_id}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                style={{
                  padding: '9px 12px', cursor: 'pointer', fontSize: '13px',
                  background: i === activeIdx ? 'var(--color-primary-light)' : 'white',
                  borderBottom: i < suggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <span style={{ color: 'var(--text-tertiary)', fontSize: '13px', flexShrink: 0 }}>📍</span>
                <div>
                  <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{main}</span>
                  {secondary && (
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '6px', fontSize: '12px' }}>
                      {secondary}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
