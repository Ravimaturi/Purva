import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  if (!name) return '';
  
  // Remove titles like Mr., Ms., Dr. etc.
  const cleanName = name.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.|Prof\.)\s+/i, '');
  
  const parts = cleanName.split(/\s+/).filter(part => part.length > 0);
  
  if (parts.length === 0) return '';
  
  // Get first letter of each part, up to 3 parts
  return parts
    .slice(0, 3)
    .map(part => part[0].toUpperCase())
    .join('');
}
