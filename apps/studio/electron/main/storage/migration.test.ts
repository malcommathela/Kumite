import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { migrateUserData } from './migration';

const roots: string[] = [];

function workspace(): { legacy: string; target: string; root: string } {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kumite-migration-'));
    roots.push(root);
    const legacy = path.join(root, 'appData', 'Onlook');
    const target = path.join(root, 'appData', 'Kumite');
    fs.mkdirSync(legacy, { recursive: true });
    return { legacy, target, root };
}

function write(file: string, content: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
}

after(() => {
    for (const root of roots) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

describe('user data migration', () => {
    it('reports no legacy data and creates nothing', () => {
        const { legacy, target } = workspace();
        fs.rmSync(legacy, { recursive: true, force: true });

        const report = migrateUserData({ legacyCandidates: [legacy], targetDir: target });

        assert.equal(report.status, 'no-legacy-data');
        assert.equal(fs.existsSync(target), false);
    });

    it('copies settings, projects, collections and images', () => {
        const { legacy, target } = workspace();
        write(path.join(legacy, 'user-settings.json'), '{"theme":"dark"}');
        write(path.join(legacy, 'projects.json'), '{"projects":[{"id":"p1"}]}');
        write(path.join(legacy, 'conversations-v1', 'c1.json'), '{"id":"c1"}');
        write(path.join(legacy, 'conversations-v1', 'index.json'), '{"collections":{}}');
        write(path.join(legacy, 'images', 'logo.png'), 'not-really-a-png');
        write(path.join(legacy, 'auth-tokens-v1.json'), 'ZW5jcnlwdGVk');

        const report = migrateUserData({ legacyCandidates: [legacy], targetDir: target });

        assert.equal(report.status, 'migrated');
        assert.equal(report.legacyDir, legacy);
        assert.deepEqual(report.copied.sort(), [
            'auth-tokens-v1.json',
            'conversations-v1/c1.json',
            'conversations-v1/index.json',
            'images/logo.png',
            'projects.json',
            'user-settings.json',
        ]);
        assert.equal(
            fs.readFileSync(path.join(target, 'user-settings.json'), 'utf8'),
            '{"theme":"dark"}',
        );
        assert.equal(fs.readFileSync(path.join(target, 'auth-tokens-v1.json'), 'utf8'), 'ZW5jcnlwdGVk');
        assert.ok(fs.existsSync(path.join(target, 'migration.json')));
        assert.equal(fs.existsSync(path.join(target, '.migration-staging')), false);
    });

    it('is idempotent and keeps the source intact', () => {
        const { legacy, target } = workspace();
        write(path.join(legacy, 'user-settings.json'), '{"theme":"dark"}');

        const first = migrateUserData({ legacyCandidates: [legacy], targetDir: target });
        const second = migrateUserData({ legacyCandidates: [legacy], targetDir: target });

        assert.equal(first.status, 'migrated');
        assert.equal(second.status, 'already-migrated');
        assert.equal(second.copied.length, 0);
        assert.ok(fs.existsSync(path.join(legacy, 'user-settings.json')));
    });

    it('never overwrites files the Kumite install already owns', () => {
        const { legacy, target } = workspace();
        write(path.join(legacy, 'user-settings.json'), '{"theme":"dark"}');
        write(path.join(legacy, 'projects.json'), '{"projects":[{"id":"old"}]}');
        write(path.join(target, 'user-settings.json'), '{"theme":"light"}');

        const report = migrateUserData({ legacyCandidates: [legacy], targetDir: target });

        assert.equal(report.status, 'migrated');
        assert.deepEqual(report.keptExisting, ['user-settings.json']);
        assert.equal(
            fs.readFileSync(path.join(target, 'user-settings.json'), 'utf8'),
            '{"theme":"light"}',
        );
        assert.equal(
            fs.readFileSync(path.join(target, 'projects.json'), 'utf8'),
            '{"projects":[{"id":"old"}]}',
        );
    });

    it('skips a corrupt JSON file, reports it, and still migrates the rest', () => {
        const { legacy, target } = workspace();
        write(path.join(legacy, 'user-settings.json'), '{ this is not json');
        write(path.join(legacy, 'projects.json'), '{"projects":[]}');

        const report = migrateUserData({ legacyCandidates: [legacy], targetDir: target });

        assert.equal(report.status, 'partial');
        assert.deepEqual(report.skippedInvalid, ['user-settings.json']);
        assert.equal(fs.existsSync(path.join(target, 'user-settings.json')), false);
        assert.ok(fs.existsSync(path.join(target, 'projects.json')));
        assert.match(report.message, /originals are untouched/);
        assert.equal(fs.readFileSync(path.join(legacy, 'user-settings.json'), 'utf8'), '{ this is not json');
    });

    it('clears a staging directory left by an interrupted run', () => {
        const { legacy, target } = workspace();
        write(path.join(legacy, 'projects.json'), '{"projects":[]}');
        write(path.join(target, '.migration-staging', 'half-copied.json'), '{"partial":true}');

        const report = migrateUserData({ legacyCandidates: [legacy], targetDir: target });

        assert.equal(report.status, 'migrated');
        assert.equal(fs.existsSync(path.join(target, '.migration-staging')), false);
        assert.equal(fs.existsSync(path.join(target, 'half-copied.json')), false);
    });

    it('accepts an empty cleared settings file', () => {
        const { legacy, target } = workspace();
        write(path.join(legacy, 'user-settings.json'), '');

        const report = migrateUserData({ legacyCandidates: [legacy], targetDir: target });

        assert.equal(report.status, 'migrated');
        assert.deepEqual(report.skippedInvalid, []);
    });
});
