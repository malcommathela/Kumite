import { CreateMethod } from '@/routes/projects/helpers';
import { MainChannels } from '@kumite/models/constants';
import { createSetupStep } from '../SetupStep';

export const LoadSetupProject = createSetupStep({
    channel: MainChannels.SETUP_PROJECT_CALLBACK,
    method: CreateMethod.LOAD,
    stageProgress: {
        installing: 50,
        configuring: 75,
        complete: 100,
    },
    errorMessageClassName: 'overflow-auto max-h-96',
});
