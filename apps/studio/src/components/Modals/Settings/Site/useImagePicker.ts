import { useEditorEngine } from '@/components/Context';
import {
    type ChangeEvent,
    type DragEvent,
    type MouseEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

/**
 * Shared upload/drop state for the site image and favicon pickers.
 * Resolves stored asset URLs to their inline content and reports the raw file.
 */
export function useImagePicker(url: string | undefined, onImageSelect: (file: File) => void) {
    const editorEngine = useEditorEngine();
    const [selectedImage, setSelectedImage] = useState<string | null>(url ?? null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resolveImage = useCallback(
        (value: string | undefined) => {
            if (!value) {
                return null;
            }
            const asset = editorEngine.image.assets.find((image) => value.includes(image.fileName));
            return asset?.content ?? value;
        },
        [editorEngine.image.assets],
    );

    useEffect(() => {
        setSelectedImage(resolveImage(url));
    }, [url, resolveImage]);

    const saveImage = useCallback(
        (file: File) => {
            setSelectedImage(URL.createObjectURL(file));
            onImageSelect(file);
        },
        [onImageSelect],
    );

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const imageFile = Array.from(e.dataTransfer.files).find((file) =>
                file.type.startsWith('image/'),
            );
            if (imageFile) {
                saveImage(imageFile);
            }
        },
        [saveImage],
    );

    const handleFileSelect = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const imageFile = Array.from(e.target.files || []).find((file) =>
                file.type.startsWith('image/'),
            );
            if (imageFile) {
                saveImage(imageFile);
            }
        },
        [saveImage],
    );

    const openFilePicker = useCallback((e: MouseEvent) => {
        e.preventDefault();
        fileInputRef.current?.click();
    }, []);

    const reset = useCallback(() => {
        setSelectedImage(resolveImage(url));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [resolveImage, url]);

    return {
        selectedImage,
        isDragging,
        fileInputRef,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleFileSelect,
        openFilePicker,
        reset,
    };
}
