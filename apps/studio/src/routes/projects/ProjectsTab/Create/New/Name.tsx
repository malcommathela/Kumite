import { Button } from '@kumite/ui/button';
import { CardDescription, CardTitle } from '@kumite/ui/card';
import { Input } from '@kumite/ui/input';
import { Label } from '@kumite/ui/label';
import { getRandomPlaceholder } from '../../../helpers';
import type { StepComponent } from '../withStepProps';

const NewNameProject: StepComponent = ({ props, variant }) => {
    const { projectData, setProjectData, nextStep, prevStep } = props;

    const renderHeader = () => (
        <>
            <CardTitle>{"Let's name your project"}</CardTitle>
            <CardDescription>
                {'If you want it to be different from the project folder name'}
            </CardDescription>
        </>
    );

    const renderContent = () => (
        <div className="flex flex-col w-full gap-2">
            <Label htmlFor="text">Project Name</Label>
            <Input
                className="bg-secondary"
                type="text"
                placeholder={getRandomPlaceholder()}
                value={projectData.name || ''}
                onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
            />
        </div>
    );

    const renderFooter = () => (
        <>
            <Button type="button" onClick={prevStep} variant="ghost">
                Back
            </Button>
            <Button
                disabled={!projectData.name || projectData.name.length === 0}
                type="button"
                onClick={nextStep}
                variant="outline"
            >
                Next
            </Button>
        </>
    );

    switch (variant) {
        case 'header':
            return renderHeader();
        case 'content':
            return renderContent();
        case 'footer':
            return renderFooter();
    }
};

export { NewNameProject };
