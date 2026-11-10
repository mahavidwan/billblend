// Enforces >= 3 alphanumeric characters (ignoring spaces)
export function isValidName(name: string): boolean {
  const stripped = name.replace(/[^a-zA-Z0-9]/g, '');
  return stripped.length >= 3;
}

// Checks if the proposed name already exists in the list (Case Insensitive)
export function isDuplicateName(proposedName: string, existingNames: string[]): boolean {
  const cleanProposed = proposedName.trim().toLowerCase();
  return existingNames.some(name => name.trim().toLowerCase() === cleanProposed);
}

// Cleans up double spaces and trims edges
export function formatName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}