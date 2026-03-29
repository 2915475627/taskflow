import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../Dialog';

describe('Dialog', () => {
  it('should not render content when closed', () => {
    render(
      <Dialog open={false}>
        <DialogContent data-testid="dialog-content">
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument();
  });

  it('should render content when open', () => {
    render(
      <Dialog open={true}>
        <DialogContent data-testid="dialog-content">
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
  });

  it('should render DialogTitle', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogTitle>My Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('should render DialogDescription', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>My Description</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByText('My Description')).toBeInTheDocument();
  });

  it('should call onOpenChange when close button is clicked', async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should render DialogFooter when provided', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
          <DialogFooter data-testid="footer">
            <button>Cancel</button>
            <button>Confirm</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });
});
