import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Australian address autocomplete using google.maps.places.AutocompleteSuggestion
 * (new Places API, replaces the deprecated AutocompleteService).
 */
const AddressAutocomplete = ({ value, onChange, placeholder, style, className }) => {
  const [inputVal,    setInputVal]    = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open,        setOpen]        = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(-1);
  const [ready,       setReady]       = useState(false);

  const containerRef = useRef(null);
  const debounceRef  = useRef(null);

  // Keep inputVal in sync with external changes (AI pre-fill etc.)
  useEffect(() => { setInputVal(value || ''); }, [value]);

  // Wait for Maps to load via the __mapsQueue bridge in index.html,
  // then confirm the new AutocompleteSuggestion class is available.
  useEffect(() => {
    const init = () => {
      if (window.google?.maps?.places?.AutocompleteSuggestion) {
        setReady(true);
      } else {
        console.warn('[AddressAutocomplete] AutocompleteSuggestion not available — check API key and library load');
      }
    };

    if (window.__mapsReady) {
      init();
    } else {
      window.__mapsQueue = window.__mapsQueue || [];
      window.__mapsQueue.push(init);
      return () => {
        window.__mapsQueue = (window.__mapsQueue || []).filter(fn => fn !== init);
      };
    }
  }, []);

  const fetchSuggestions = useCallback(async (input) => {
    if (!ready || !input || input.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    try {
      const { suggestions: results } =
        await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          includedRegionCodes: ['au'],
        });
      if (results?.length) {
        setSuggestions(results);
        setOpen(true);
        setActiveIdx(-1);
      } else {
        setSuggestions([]);
        setOpen(false);
      }
    } catch (e) {
      console.warn('[AddressAutocomplete] fetchAutocompleteSuggestions error:', e);
      setSuggestions([]);
      setOpen(false);
    }
  }, [ready]);

  const handleChange = (e) => {
    const val = e.target.value;
    setInputVal(val);
    onChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (s) => {
    const description = s.placePrediction.text.text;
    setInputVal(description);
    setSuggestions([]);
    setOpen(false);
    onChange(description);
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
            const pred      = s.placePrediction;
            const main      = pred.mainText?.text || pred.text.text;
            const secondary = pred.secondaryText?.text || '';
            return (
              <div
                key={pred.placeId}
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
