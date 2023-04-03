import allRequiredPackageManifestPropertiesPresent from './all-required-package-manifest-properties-present';
import allRequiredTsConfigPropertiesPresent from './all-required-tsconfig-properties-present';
import noUnknownEntries from './no-unknown-entries';
import requirePackageManifest from './require-package-manifest';
import requireSourceDirectory from './require-source-directory';
import requireTsConfig from './require-tsconfig';
import yarn1ConfigAbsent from './yarn1-config-absent';

export const rules = [
  allRequiredPackageManifestPropertiesPresent,
  allRequiredTsConfigPropertiesPresent,
  noUnknownEntries,
  requirePackageManifest,
  requireSourceDirectory,
  requireTsConfig,
  yarn1ConfigAbsent,
];
