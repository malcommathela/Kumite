import { Button } from '@kumite/ui/button';
import React, { forwardRef, useImperativeHandle } from 'react';
import { useImagePicker } from './useImagePicker';

export interface FaviconRef {
    reset: () => void;
}

export const Favicon = forwardRef<
    FaviconRef,
    { onImageSelect: (file: File) => void; url?: string }
>(({ onImageSelect, url }, ref) => {
    const {
        selectedImage,
        isDragging,
        fileInputRef,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleFileSelect,
        openFilePicker,
        reset,
    } = useImagePicker(url, onImageSelect);

    useImperativeHandle(ref, () => ({ reset }), [reset]);

    return (
        <div className="p-2">
            <div
                className={`group h-16 w-16 bg-background-secondary rounded flex items-center justify-center p-4 
                    ${isDragging ? 'border-2 border-dashed border-primary' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ico"
                    className="hidden"
                    id="favicon-upload"
                    onChange={handleFileSelect}
                />
                {selectedImage && <img src={selectedImage} />}
            </div>
            <UploadButton onButtonClick={openFilePicker} />
        </div>
    );
});

Favicon.displayName = 'Favicon';

export const UploadButton: React.FC<{ onButtonClick: (e: React.MouseEvent) => void }> = ({
    onButtonClick,
}) => (
    <Button
        variant="secondary"
        className="flex items-center gap-2 px-4 py-0 backdrop-blur-sm rounded border border-foreground-tertiary/20 mt-2"
        type="button"
        onClick={onButtonClick}
    >
        <span>Upload Image</span>
    </Button>
);
