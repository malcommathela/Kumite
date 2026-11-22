import { CreateMethod } from '@/routes/projects/helpers';
import { MainChannels } from '@kumite/models/constants';
import { createSetupStep } from '../SetupStep';

export const NewSetupProject = createSetupStep({
    channel: MainChannels.CREATE_NEW_PROJECT_CALLBACK,
    method: CreateMethod.NEW,
    stageProgress: {
        cloning: 30,
        git_init: 50,
        installing: 80,
        complete: 100,
    },
});
