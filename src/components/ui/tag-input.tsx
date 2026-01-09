import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BUSINESS_TYPE_SUGGESTIONS } from '@/lib/constants';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  maxTags?: number;
  className?: string;
}

export function TagInput({
  value,
  onChange,
  placeholder = 'Type and press Enter...',
  suggestions = BUSINESS_TYPE_SUGGESTIONS,
  maxTags = 20,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  const filteredSuggestions = inputValue.trim()
    ? suggestions
        .filter(
          (s) =>
            s.toLowerCase().includes(inputValue.toLowerCase()) &&
            !value.some((v) => v.toLowerCase() === s.toLowerCase())
        )
        .slice(0, 8)
    : [];

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (
      trimmedTag &&
      !value.some((v) => v.toLowerCase() === trimmedTag.toLowerCase()) &&
      value.length < maxTags
    ) {
      onChange([...value, trimmedTag]);
    }
    setInputValue('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const removeTag = (index: number) => {
    const newTags = [...value];
    newTags.splice(index, 1);
    onChange(newTags);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
        addTag(filteredSuggestions[selectedIndex]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
      setShowSuggestions(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex flex-wrap gap-2 p-2 min-h-[44px] rounded-md border border-input bg-background',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          'cursor-text'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1 text-sm bg-primary/10 text-primary hover:bg-primary/20"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              className="ml-1 hover:bg-primary/30 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm placeholder:text-muted-foreground"
          disabled={value.length >= maxTags}
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 py-1 bg-popover border border-border rounded-md shadow-lg max-h-[200px] overflow-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2',
                selectedIndex === index && 'bg-accent'
              )}
              onClick={() => addTag(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Plus className="h-3 w-3 text-muted-foreground" />
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Quick suggestions when empty */}
      {!inputValue && value.length === 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Popular:</span>
          {['Restaurants', 'Dentists', 'Lawyers', 'Real Estate Agents', 'Plumbers'].map(
            (suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className="text-xs px-2 py-0.5 bg-muted hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                + {suggestion}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default TagInput;
