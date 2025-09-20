/**
 * Client-side credential security utilities
 * For proper encryption/decryption in production, use proper cryptographic libraries
 */

/**
 * Mask password for display (show only first 2 and last 2 characters)
 */
export function maskPassword(password: string): string {
  if (!password) return '';
  if (password.length <= 4) return '*'.repeat(password.length);
  
  const first = password.slice(0, 2);
  const last = password.slice(-2);
  const middle = '*'.repeat(Math.max(4, password.length - 4));
  
  return `${first}${middle}${last}`;
}

/**
 * Generate a password strength indicator
 */
export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: 'No password', color: 'text-muted-foreground' };
  
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  
  if (score <= 2) return { score, label: 'Weak', color: 'text-destructive' };
  if (score <= 4) return { score, label: 'Fair', color: 'text-warning' };
  return { score, label: 'Strong', color: 'text-success' };
}

/**
 * Validate credential requirements
 */
export function validateCredentials(credentials: {
  name: string;
  username: string;
  password: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!credentials.name.trim()) {
    errors.push('Profile name is required');
  }
  
  if (!credentials.username.trim()) {
    errors.push('Username is required');
  }
  
  if (!credentials.password) {
    errors.push('Password is required');
  } else if (credentials.password.length < 3) {
    errors.push('Password must be at least 3 characters');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format credential name for display
 */
export function formatCredentialDisplay(profile: {
  name: string;
  username: string;
  protocol?: string;
  port?: number;
  is_default?: boolean;
}): string {
  const parts = [profile.name];
  
  if (profile.is_default) {
    parts.push('(Default)');
  }
  
  return parts.join(' ');
}

/**
 * Get credential security recommendations
 */
export function getSecurityRecommendations(profile: {
  name: string;
  username: string;
  password: string;
  created_at?: string;
}): string[] {
  const recommendations: string[] = [];
  
  const strength = getPasswordStrength(profile.password);
  if (strength.score < 4) {
    recommendations.push('Consider using a stronger password with mixed case, numbers, and symbols');
  }
  
  if (profile.username === 'admin' || profile.username === 'root') {
    recommendations.push('Consider using a non-standard username for better security');
  }
  
  if (profile.password.toLowerCase().includes(profile.username.toLowerCase())) {
    recommendations.push('Password should not contain the username');
  }
  
  // Check if credentials are old (if created_at is available)
  if (profile.created_at) {
    const created = new Date(profile.created_at);
    const monthsOld = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsOld > 6) {
      recommendations.push('Consider rotating these credentials - they are over 6 months old');
    }
  }
  
  return recommendations;
}