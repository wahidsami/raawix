import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

export function DropdownMenu({ trigger, children, align = 'right' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isRTL } = useLanguage();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const alignment = isRTL ? (align === 'right' ? 'left' : 'right') : align;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {trigger}
      </button>
      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-56 rounded-md bg-card border border-border shadow-lg ${
            alignment === 'right' ? 'right-0' : 'left-0'
          }`}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function DropdownMenuItem({ children, onClick, className = '' }: DropdownMenuItemProps) {
  return (
    <button
      onClick={() => {
        onClick?.();
      // Close dropdown after click
        setTimeout(() => {
          const event = new MouseEvent('mousedown', { bubbles: true });
          document.dispatchEvent(event);
        }, 0);
      }}
      className={`w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md ${className}`}
      role="menuitem"
    >
      {children}
    </button>
  );
}

interface DropdownMenuSeparatorProps {
  className?: string;
}

export function DropdownMenuSeparator({ className = '' }: DropdownMenuSeparatorProps) {
  return <div className={`h-px bg-border my-1 ${className}`} />;
}

interface DropdownMenuHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DropdownMenuHeader({ children, className = '' }: DropdownMenuHeaderProps) {
  return (
    <div className={`px-4 py-2 text-xs font-semibold text-muted-foreground border-b border-border ${className}`}>
      {children}
    </div>
  );
}

