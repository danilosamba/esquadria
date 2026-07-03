import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import CustomModal, { ModalOptions } from '../components/CustomModal';

interface ModalContextType {
  showModal: (options: ModalOptions) => void;
  hideModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [modalOptions, setModalOptions] = useState<ModalOptions | null>(null);

  const showModal = useCallback((options: ModalOptions) => {
    setModalOptions(options);
  }, []);

  const hideModal = useCallback(() => {
    setModalOptions(null);
  }, []);

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      {modalOptions && <CustomModal options={modalOptions} onClose={hideModal} />}
    </ModalContext.Provider>
  );
};
