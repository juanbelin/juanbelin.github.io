import manifest from './reports-manifest.json';
import { platforms, reportsRepository, platformLabel } from '@/lib/report-catalog.mjs';

export interface Report {
  path: string;
  folder: string;
  platform: string;
  title: string;
  section: string;
  format: string;
  remoteUrl: string;
  sourceUrl: string;
  size: number;
}
export { platforms, reportsRepository };
export const reports = manifest as Report[];
export const reportGroups = [
  ...platforms,
  ...[...new Set(reports.map(report => report.folder))]
    .filter(folder => !platforms.some(platform => platform.folder.toLowerCase() === folder.toLowerCase()))
    .map(folder => ({ folder, label: platformLabel(folder) })),
].map(platform => ({ ...platform, reports: reports.filter(report => report.folder.toLowerCase() === platform.folder.toLowerCase()) }));
