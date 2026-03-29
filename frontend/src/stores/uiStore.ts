import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  // Panel visibility
  isNodePanelOpen: boolean;
  isDeployDialogOpen: boolean;
  isVersionHistoryOpen: boolean;

  // Panel state
  sidebarCollapsed: boolean;

  // Actions
  openNodePanel: () => void;
  closeNodePanel: () => void;
  toggleNodePanel: () => void;

  openDeployDialog: () => void;
  closeDeployDialog: () => void;

  openVersionHistory: () => void;
  closeVersionHistory: () => void;

  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      isNodePanelOpen: false,
      isDeployDialogOpen: false,
      isVersionHistoryOpen: false,
      sidebarCollapsed: false,

      openNodePanel: () => {
        set({ isNodePanelOpen: true }, false, 'openNodePanel');
      },

      closeNodePanel: () => {
        set({ isNodePanelOpen: false }, false, 'closeNodePanel');
      },

      toggleNodePanel: () => {
        set(
          (state) => ({ isNodePanelOpen: !state.isNodePanelOpen }),
          false,
          'toggleNodePanel'
        );
      },

      openDeployDialog: () => {
        set({ isDeployDialogOpen: true }, false, 'openDeployDialog');
      },

      closeDeployDialog: () => {
        set({ isDeployDialogOpen: false }, false, 'closeDeployDialog');
      },

      openVersionHistory: () => {
        set({ isVersionHistoryOpen: true }, false, 'openVersionHistory');
      },

      closeVersionHistory: () => {
        set({ isVersionHistoryOpen: false }, false, 'closeVersionHistory');
      },

      toggleSidebar: () => {
        set(
          (state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
          false,
          'toggleSidebar'
        );
      },
    }),
    { name: 'UIStore' }
  )
);
