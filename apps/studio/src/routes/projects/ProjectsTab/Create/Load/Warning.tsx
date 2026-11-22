import { Button } from '@kumite/ui/button';
import { CardTitle } from '@kumite/ui/card';
import { Icons } from '@kumite/ui/icons';
import type { StepComponent } from '../withStepProps';

const LoadWarning: StepComponent = ({ props, variant }) => {
    const { prevStep, nextStep } = props;

    const renderHeader = () => (
        <div className="flex flex-row items-center gap-2">
            <Icons.ExclamationTriangle className="w-5 h-5" />
            <CardTitle>{'Warning: Save your progress'}</CardTitle>
        </div>
    );

    const renderContent = () => (
        <p className="text-[13px] leading-5 text-foreground-secondary">
            Kumite will make code changes to your project.
            <br />
            Please save your progress before importing.
        </p>
    );

    const renderFooter = () => (
        <>
            <Button type="button" onClick={prevStep} variant="ghost">
                Back
            </Button>
            <Button type="button" onClick={nextStep} variant="outline">
                I understand
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

export { LoadWarning };
