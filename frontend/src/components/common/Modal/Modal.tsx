import React from 'react'
import style from './Modal.module.css'

type ModalProps = {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
};

export function Modal({ open, onClose, title, children }: ModalProps) {
    if (!open) return null;
    return (
        <div className={style.modalOverlay} onClick={onClose}>
            <div
                className={`${style.modalContent}`}
                onClick={e => e.stopPropagation()}
            >
                {title && <h2>{title}</h2>}
                {children}
                <button className={style.closeButton} onClick={onClose} aria-label="Close modal">
                    &times;
                </button>
            </div>
        </div>
    );
}
