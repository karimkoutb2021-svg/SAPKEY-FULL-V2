'use client';

export const SEED_CREDENTIALS = [
  { email: 'sapkeyglobal@gmail.com', password: '123456', role: 'admin', label: 'مطور النظام' },
];

export async function ensureDemoUsers(): Promise<void> {
  // Admin account is now created directly in the login page
  // This function is kept for backward compatibility
}
