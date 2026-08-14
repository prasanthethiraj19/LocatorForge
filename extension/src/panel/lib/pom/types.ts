import type { Candidate, FrameworkId } from '../locators/types';

export interface PomItem {
  id: string;
  fieldName: string;
  candidate: Candidate;
  addedAt: number;
}

export interface PomConfig {
  className: string;
  framework: FrameworkId;
  url: string;
  packageName?: string;
}
