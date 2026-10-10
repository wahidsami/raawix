interface DropdownMenuProps {
    trigger: React.ReactNode;
    children: React.ReactNode;
    align?: 'left' | 'right';
}
export declare function DropdownMenu({ trigger, children, align }: DropdownMenuProps): import("react").JSX.Element;
interface DropdownMenuItemProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
}
export declare function DropdownMenuItem({ children, onClick, className }: DropdownMenuItemProps): import("react").JSX.Element;
interface DropdownMenuSeparatorProps {
    className?: string;
}
export declare function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps): import("react").JSX.Element;
interface DropdownMenuHeaderProps {
    children: React.ReactNode;
    className?: string;
}
export declare function DropdownMenuHeader({ children, className }: DropdownMenuHeaderProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=dropdown-menu.d.ts.map