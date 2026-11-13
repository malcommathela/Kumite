import { type IconProps, Icons } from '@kumite/ui/icons';

export interface SizePreset {
    name: string;
    width: number;
    height: number;
    icon: React.FC<IconProps>;
    device: string;
}

export const SIZE_PRESETS: SizePreset[] = [
    { name: 'Desktop', width: 1440, height: 1024, icon: Icons.Desktop, device: 'Desktop:Desktop' },
    { name: 'Laptop', width: 1280, height: 832, icon: Icons.Laptop, device: 'Laptop:MacBook Air' },
    { name: 'Tablet', width: 768, height: 1024, icon: Icons.Tablet, device: 'Tablet:iPad Mini 5' },
    { name: 'Mobile', width: 320, height: 568, icon: Icons.Mobile, device: 'Phone:iPhone SE' },
];
