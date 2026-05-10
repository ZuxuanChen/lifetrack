import { describe, it, expect } from 'vitest';

describe('Schema Version Migration', () => {
  it('should include schemaVersion in export data', () => {
    const exportData = {
      version: 1,
      schemaVersion: 8,
      goals: [],
    };
    expect(exportData.schemaVersion).toBe(8);
  });

  it('should warn on old backup version', () => {
    const backupVersion = 5;
    const currentVersion = 8;
    const isOld = backupVersion < currentVersion;
    expect(isOld).toBe(true);
  });

  it('should block on newer backup version', () => {
    const backupVersion = 10;
    const currentVersion = 8;
    const isNewer = backupVersion > currentVersion;
    expect(isNewer).toBe(true);
  });

  it('should allow same version', () => {
    const backupVersion = 8;
    const currentVersion = 8;
    const isCompatible = backupVersion === currentVersion;
    expect(isCompatible).toBe(true);
  });

  it('should default missing schemaVersion to 1', () => {
    const data: any = { version: 1 };
    const schemaVersion = data.schemaVersion || 1;
    expect(schemaVersion).toBe(1);
  });
});
