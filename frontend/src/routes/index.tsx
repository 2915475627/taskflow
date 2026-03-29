import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from '@/App';
import { WorkflowEditorPage } from '@/pages/WorkflowEditorPage';
import { WorkflowListPage } from '@/pages/WorkflowListPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <WorkflowListPage />,
      },
      {
        path: 'editor/:workflowId?',
        element: <WorkflowEditorPage />,
      },
    ],
  },
]);

export function Routes() {
  return <RouterProvider router={router} />;
}
