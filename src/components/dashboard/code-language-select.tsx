"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CODE_LANGUAGE_OPTIONS,
  getCodeLanguageLabel,
  normalizeCodeLanguage,
} from "@/lib/code-languages";

export function CodeLanguageSelect({
  alignItemWithTrigger = true,
  ariaLabel = "Programming language",
  disabled = false,
  onChange,
  value,
}: Readonly<{
  alignItemWithTrigger?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
}>) {
  const selectedValue = normalizeCodeLanguage(value);
  const hasKnownValue = CODE_LANGUAGE_OPTIONS.some(
    (option) => option.value === selectedValue
  );
  const options = hasKnownValue
    ? CODE_LANGUAGE_OPTIONS
    : [
        ...CODE_LANGUAGE_OPTIONS,
        { value: selectedValue, label: getCodeLanguageLabel(value) },
      ];

  return (
    <Select
      disabled={disabled}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onChange(nextValue);
        }
      }}
      value={selectedValue}
    >
      <SelectTrigger aria-label={ariaLabel}>
        <SelectValue placeholder="Choose a language">
          {(currentValue) =>
            options.find((option) => option.value === currentValue)?.label ??
            "Choose a language"
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={alignItemWithTrigger}>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            label={option.label}
            value={option.value}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
