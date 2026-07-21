export const CODE_LANGUAGE_OPTIONS = [
  { value: "plaintext", label: "Plain text" },
  { value: "shell", label: "Bash / Shell" },
  { value: "bat", label: "Batch" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "css", label: "CSS" },
  { value: "dart", label: "Dart" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "elixir", label: "Elixir" },
  { value: "fsharp", label: "F#" },
  { value: "go", label: "Go" },
  { value: "graphql", label: "GraphQL" },
  { value: "hcl", label: "HCL / Terraform" },
  { value: "html", label: "HTML" },
  { value: "java", label: "Java" },
  { value: "javascript", label: "JavaScript / JSX" },
  { value: "json", label: "JSON" },
  { value: "julia", label: "Julia" },
  { value: "kotlin", label: "Kotlin" },
  { value: "less", label: "Less" },
  { value: "lua", label: "Lua" },
  { value: "markdown", label: "Markdown" },
  { value: "mysql", label: "MySQL" },
  { value: "objective-c", label: "Objective-C" },
  { value: "perl", label: "Perl" },
  { value: "php", label: "PHP" },
  { value: "pgsql", label: "PostgreSQL" },
  { value: "powershell", label: "PowerShell" },
  { value: "python", label: "Python" },
  { value: "r", label: "R" },
  { value: "ruby", label: "Ruby" },
  { value: "rust", label: "Rust" },
  { value: "scala", label: "Scala" },
  { value: "scss", label: "SCSS" },
  { value: "sql", label: "SQL" },
  { value: "swift", label: "Swift" },
  { value: "typescript", label: "TypeScript / TSX" },
  { value: "vb", label: "Visual Basic" },
  { value: "xml", label: "XML" },
  { value: "yaml", label: "YAML" },
] as const;

const languageAliases: Readonly<Record<string, string>> = {
  bash: "shell",
  js: "javascript",
  jsx: "javascript",
  md: "markdown",
  py: "python",
  sh: "shell",
  text: "plaintext",
  ts: "typescript",
  tsx: "typescript",
  txt: "plaintext",
  zsh: "shell",
};

export function normalizeCodeLanguage(language?: string | null) {
  const value = language?.trim().toLowerCase();

  if (!value) {
    return "plaintext";
  }

  return languageAliases[value] ?? value;
}

export function getCodeLanguageLabel(language?: string | null) {
  const normalizedLanguage = normalizeCodeLanguage(language);
  const option = CODE_LANGUAGE_OPTIONS.find(
    ({ value }) => value === normalizedLanguage
  );

  return option?.label ?? language?.trim() ?? normalizedLanguage;
}

export function getDefaultCodeLanguage(itemTypeSlug?: string) {
  return itemTypeSlug === "command" ? "shell" : "plaintext";
}
