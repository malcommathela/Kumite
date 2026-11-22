import { Button } from '@kumite/ui/button';
import React, { forwardRef, useImperativeHandle } from 'react';
import { useImagePicker } from './useImagePicker';

export interface ImagePickerRef {
    reset: () => void;
}

const ImagePicker = forwardRef<
    ImagePickerRef,
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
        <div className="flex flex-col gap-2 p-2 text-xs">
            <div
                className={`group h-32 w-60 bg-background-secondary rounded flex items-center justify-center p-4 
                    ${isDragging ? 'border-2 border-dashed border-primary' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                    backgroundImage: selectedImage ? `url(${selectedImage})` : 'none',
                    backgroundSize: 'cover',
                }}
            >
                <UploadButton onButtonClick={openFilePicker} />
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="image-upload"
                    onChange={handleFileSelect}
                />
            </div>
        </div>
    );
});

ImagePicker.displayName = 'ImagePicker';

export const UploadButton: React.FC<{ onButtonClick: (e: React.MouseEvent) => void }> = ({
    onButtonClick,
}) => (
    <Button
        variant="secondary"
        className="flex items-center gap-2 px-4 py-0 backdrop-blur-sm rounded border border-foreground-tertiary/20 opacity-0 group-hover:opacity-90 transition-opacity"
        type="button"
        onClick={onButtonClick}
    >
        <span>Upload Image</span>
    </Button>
);

export default ImagePicker;
