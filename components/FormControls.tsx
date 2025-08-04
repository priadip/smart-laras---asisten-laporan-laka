
import React, { useState, useEffect, useRef } from 'react';

const MAX_SUGGESTIONS_TO_SHOW = 5;

export interface LabeledInputProps {
  label: string;
  id: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  inputClassName?: string;
  min?: string | number;
  suggestionsKey?: string; // Unique key for this input's suggestions
  getSuggestionsFunc?: (key: string) => string[];
  addSuggestionFunc?: (key: string, value: string) => void;
  readOnly?: boolean;
}

export const LabeledInput: React.FC<LabeledInputProps> = ({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  inputClassName = "",
  min,
  suggestionsKey,
  getSuggestionsFunc,
  addSuggestionFunc,
  readOnly = false,
}) => {
  const [displaySuggestions, setDisplaySuggestions] = useState<string[]>([]);
  const [isSuggestionsPanelVisible, setIsSuggestionsPanelVisible] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsSuggestionsPanelVisible(false);
      }
    };
    if (isSuggestionsPanelVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSuggestionsPanelVisible]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event); // Propagate change to parent
    const currentValue = event.target.value as string;

    if (suggestionsKey && getSuggestionsFunc && type === "text") { // Only for text inputs
      if (currentValue.length > 0) {
        const allSuggestions = getSuggestionsFunc(suggestionsKey);
        const filtered = allSuggestions
          .filter(s => s.toLowerCase().includes(currentValue.toLowerCase()) && s.toLowerCase() !== currentValue.toLowerCase())
          .slice(0, MAX_SUGGESTIONS_TO_SHOW);
        setDisplaySuggestions(filtered);
        setIsSuggestionsPanelVisible(filtered.length > 0);
      } else {
        setIsSuggestionsPanelVisible(false);
        setDisplaySuggestions([]);
      }
    }
  };

  const handleInputFocus = () => {
    // Optionally show recent suggestions on focus even if input is empty, or only on type.
    // For now, suggestions appear on type. If value exists, filter.
    if (suggestionsKey && getSuggestionsFunc && type === "text" && value && String(value).length > 0) {
        const allSuggestions = getSuggestionsFunc(suggestionsKey);
        const filtered = allSuggestions
          .filter(s => s.toLowerCase().includes(String(value).toLowerCase()) && s.toLowerCase() !== String(value).toLowerCase())
          .slice(0, MAX_SUGGESTIONS_TO_SHOW);
        setDisplaySuggestions(filtered);
        setIsSuggestionsPanelVisible(filtered.length > 0);
    }
  };
  
  const handleInputBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (suggestionsKey && addSuggestionFunc && type === "text") {
      const val = event.target.value;
      if (val.trim().length > 0) {
        addSuggestionFunc(suggestionsKey, val.trim());
      }
    }
    setTimeout(() => setIsSuggestionsPanelVisible(false), 150); // Delay to allow click on suggestion
  };

  const handleSuggestionClick = (suggestion: string) => {
    const syntheticEvent = {
      target: {
        name: id,
        value: suggestion,
      },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
    setIsSuggestionsPanelVisible(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label htmlFor={id} className="flex items-center text-sm font-medium text-slate-700 mb-1">
        {icon && <span className="mr-2 h-5 w-5 text-slate-500">{icon}</span>}
        {label}
      </label>
      <input
        type={type}
        id={id}
        name={id}
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder || `Masukkan ${label.toLowerCase()}`}
        min={min}
        readOnly={readOnly}
        className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${inputClassName} ${readOnly ? 'bg-slate-100 cursor-not-allowed' : ''}`}
        autoComplete="off" // Turn off browser's default autocomplete
      />
      {isSuggestionsPanelVisible && displaySuggestions.length > 0 && type === "text" && (
        <div className="absolute z-20 w-full bg-white border border-slate-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
          {displaySuggestions.map((s, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(s)}
              className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm"
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export interface LabeledTextareaProps {
  label: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  icon?: React.ReactNode;
  suggestionsKey?: string; 
  getSuggestionsFunc?: (key: string) => string[];
  addSuggestionFunc?: (key: string, value: string) => void;
}

export const LabeledTextarea: React.FC<LabeledTextareaProps> = ({
  label,
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  icon,
  suggestionsKey,
  getSuggestionsFunc,
  addSuggestionFunc,
}) => {
  const [displaySuggestions, setDisplaySuggestions] = useState<string[]>([]);
  const [isSuggestionsPanelVisible, setIsSuggestionsPanelVisible] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsSuggestionsPanelVisible(false);
      }
    };
    if (isSuggestionsPanelVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSuggestionsPanelVisible]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event);
    const currentValue = event.target.value;

    if (suggestionsKey && getSuggestionsFunc) {
      if (currentValue.length > 0) {
        const allSuggestions = getSuggestionsFunc(suggestionsKey);
        const filtered = allSuggestions
          .filter(s => s.toLowerCase().includes(currentValue.toLowerCase()) && s.toLowerCase() !== currentValue.toLowerCase())
          .slice(0, MAX_SUGGESTIONS_TO_SHOW);
        setDisplaySuggestions(filtered);
        setIsSuggestionsPanelVisible(filtered.length > 0);
      } else {
        setIsSuggestionsPanelVisible(false);
        setDisplaySuggestions([]);
      }
    }
  };

  const handleInputFocus = () => {
     if (suggestionsKey && getSuggestionsFunc && value && String(value).length > 0) {
        const allSuggestions = getSuggestionsFunc(suggestionsKey);
        const filtered = allSuggestions
          .filter(s => s.toLowerCase().includes(String(value).toLowerCase()) && s.toLowerCase() !== String(value).toLowerCase())
          .slice(0, MAX_SUGGESTIONS_TO_SHOW);
        setDisplaySuggestions(filtered);
        setIsSuggestionsPanelVisible(filtered.length > 0);
    }
  };

  const handleInputBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    if (suggestionsKey && addSuggestionFunc) {
      const val = event.target.value;
      if (val.trim().length > 0) {
        addSuggestionFunc(suggestionsKey, val.trim());
      }
    }
    setTimeout(() => setIsSuggestionsPanelVisible(false), 150);
  };

  const handleSuggestionClick = (suggestion: string) => {
    const syntheticEvent = {
      target: {
        name: id,
        value: suggestion,
      },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    onChange(syntheticEvent);
    setIsSuggestionsPanelVisible(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label htmlFor={id} className="flex items-center text-sm font-medium text-slate-700 mb-1">
        {icon && <span className="mr-2 h-5 w-5 text-slate-500">{icon}</span>}
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        rows={rows}
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder || `Masukkan ${label.toLowerCase()}`}
        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      />
      {isSuggestionsPanelVisible && displaySuggestions.length > 0 && (
        <div className="absolute z-20 w-full bg-white border border-slate-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
          {displaySuggestions.map((s, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(s)}
              className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm"
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export interface LabeledSelectProps {
  label: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export const LabeledSelect: React.FC<LabeledSelectProps> = ({ 
  label, 
  id, 
  value, 
  onChange, 
  children, 
  disabled = false,
  icon 
}) => (
  <div>
    <label htmlFor={id} className="flex items-center text-sm font-medium text-slate-700 mb-1">
      {icon && <span className="mr-2 h-5 w-5 text-slate-500">{icon}</span>}
      {label}
    </label>
    <select
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
    >
      {children}
    </select>
  </div>
);
