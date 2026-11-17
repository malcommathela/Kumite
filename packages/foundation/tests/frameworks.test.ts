import { SetupStage, type SetupCallback } from '@kumite/models';
import { describe, expect, test } from 'bun:test';
import { Framework } from '../src/frameworks';

describe('foundation framework setup contract', () => {
    test('uses the shared model setup stages and callback type', () => {
        const received: SetupStage[] = [];
        const callback: SetupCallback = (stage) => received.push(stage);

        callback(SetupStage.INSTALLING, 'installing');
        callback(SetupStage.CONFIGURING, 'configuring');
        callback(SetupStage.COMPLETE, 'complete');

        expect(received).toEqual([
            SetupStage.INSTALLING,
            SetupStage.CONFIGURING,
            SetupStage.COMPLETE,
        ]);
        expect(Framework.VITE.setup).toBeTypeOf('function');
    });
});
