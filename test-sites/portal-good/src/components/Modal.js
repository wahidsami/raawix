import { useEffect, useRef } from 'react';
function Modal({ isOpen, onClose, title, children }) {
    const modalRef = useRef(null);
    const previousFocusRef = useRef(null);
    useEffect(() => {
        if (isOpen) {
            // Store the previously focused element
            previousFocusRef.current = document.activeElement;
            // Focus the modal
            const firstFocusable = modalRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            firstFocusable?.focus();
            // Trap focus within modal
            const handleTabKey = (e) => {
                if (e.key !== 'Tab')
                    return;
                const focusableElements = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (!focusableElements || focusableElements.length === 0)
                    return;
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                }
                else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            };
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };
            document.addEventListener('keydown', handleTabKey);
            document.addEventListener('keydown', handleEscape);
            return () => {
                document.removeEventListener('keydown', handleTabKey);
                document.removeEventListener('keydown', handleEscape);
                // Restore focus
                previousFocusRef.current?.focus();
            };
        }
    }, [isOpen, onClose]);
    if (!isOpen)
        return null;
    return (<div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => {
            if (e.target === e.currentTarget) {
                onClose();
            }
        }}>
      <div className="modal-content" ref={modalRef}>
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>);
}
export default Modal;
//# sourceMappingURL=Modal.js.map