
/**
 * Returns the initials from a full name
 * @param fullName The full name to get initials from
 * @returns First letter of first and last name
 */
export function getInitials(fullName: string): string {
  if (!fullName) return '';
  
  const names = fullName.trim().split(' ');
  if (names.length === 0) return '';
  if (names.length === 1) return names[0].substring(0, 1).toUpperCase();
  
  const firstName = names[0];
  const lastName = names[names.length - 1];
  
  return `${firstName.substring(0, 1)}${lastName.substring(0, 1)}`.toUpperCase();
}
