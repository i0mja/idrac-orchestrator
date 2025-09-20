import type { DellGeneration } from '../protocols/types.js';

export interface CompatibilityRule {
  component: string;
  supportedGenerations: DellGeneration[];
  prerequisites?: string[];
  conflicts?: string[];
}

const RULES: CompatibilityRule[] = [
  { component: 'BIOS', supportedGenerations: ['11G', '12G', '13G', '14G', '15G', '16G'] },
  { component: 'iDRAC', supportedGenerations: ['12G', '13G', '14G', '15G', '16G'], prerequisites: ['BIOS'] },
  { component: 'LifecycleController', supportedGenerations: ['12G', '13G', '14G', '15G', '16G'], prerequisites: ['BIOS'] },
  { component: 'NIC', supportedGenerations: ['11G', '12G', '13G', '14G', '15G', '16G'], prerequisites: ['BIOS'] }
];

export interface CompatibilityCheckInput {
  component: string;
  generation: DellGeneration;
  appliedComponents: string[];
}

export interface CompatibilityCheckResult {
  supported: boolean;
  reasons?: string[];
  prerequisites?: string[];
}

export function validateCompatibility(input: CompatibilityCheckInput): CompatibilityCheckResult {
  const rule = RULES.find(r => r.component.toLowerCase() === input.component.toLowerCase());
  if (!rule) {
    return { supported: true };
  }
  const supported = rule.supportedGenerations.includes(input.generation);
  const missingPrereqs = (rule.prerequisites ?? []).filter(prereq => !input.appliedComponents.includes(prereq));
  const reasons: string[] = [];
  if (!supported) {
    reasons.push(`Component ${input.component} is not supported on generation ${input.generation}`);
  }
  if (missingPrereqs.length) {
    reasons.push(`Missing prerequisites: ${missingPrereqs.join(', ')}`);
  }
  return {
    supported: supported && missingPrereqs.length === 0,
    reasons: reasons.length ? reasons : undefined,
    prerequisites: rule.prerequisites
  };
}

export function sortUpdateOrder(components: string[]): string[] {
  const order = ['BIOS', 'LifecycleController', 'iDRAC'];
  return [...components].sort((a, b) => {
    const indexA = order.indexOf(a);
    const indexB = order.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
}
