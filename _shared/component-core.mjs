export const SUPPORTED_COMPONENT_SOURCES = [
  '21st-dev',
  'shadcn-ui',
  'aceternity-ui',
  'magic-ui',
  'custom',
  'local',
];

export const INSTALLATION_STATUSES = ['available', 'installing', 'installed', 'failed'];

export function createComponentRecord(input) {
  const record = {
    id: input.id,
    name: input.name,
    source: input.source,
    sourceUrl: input.sourceUrl ?? null,
    sourceVersion: input.sourceVersion ?? null,
    framework: input.framework ?? 'react',
    files: Array.isArray(input.files) ? [...input.files] : [],
    dependencies: { ...(input.dependencies ?? {}) },
    peerDependencies: { ...(input.peerDependencies ?? {}) },
    assets: Array.isArray(input.assets) ? [...input.assets] : [],
    stylingRequirements: input.stylingRequirements ?? null,
    license: input.license ?? 'Unknown',
    attribution: input.attribution ?? null,
    installationStatus: input.installationStatus ?? 'available',
    compatibility: input.compatibility ?? null,
  };
  return record;
}

export function validateComponentRecord(record) {
  const errors = [];
  if (!record || typeof record !== 'object') return { valid: false, errors: ['record must be an object'] };
  if (!record.id) errors.push('id is required');
  if (!record.name) errors.push('name is required');
  if (!SUPPORTED_COMPONENT_SOURCES.includes(record.source)) errors.push('source is invalid');
  if (!record.license || record.license === 'Unknown') errors.push('license must be known');
  if (!record.attribution) errors.push('attribution is required');
  if (!INSTALLATION_STATUSES.includes(record.installationStatus)) errors.push('installationStatus is invalid');
  if (!Array.isArray(record.files)) errors.push('files must be an array');
  return { valid: errors.length === 0, errors };
}

export function isInstallable(record) {
  const validation = validateComponentRecord(record);
  return validation.valid && record.installationStatus === 'available';
}