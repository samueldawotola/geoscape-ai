import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseMarkdownSections(markdown: string): { title: string; body: string }[] {
  return markdown
    .split(/^##\s+/m)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [title, ...rest] = chunk.split("\n");
      return { title: title.trim(), body: rest.join("\n").trim() };
    });
}
