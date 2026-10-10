import { ReactNode } from 'react';
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}
declare function Modal({ isOpen, onClose, title, children }: ModalProps): import("react").JSX.Element | null;
export default Modal;
//# sourceMappingURL=Modal.d.ts.map