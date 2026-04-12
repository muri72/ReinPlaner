import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sonner before importing the module
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

import { handleActionResponse } from '@/lib/toast-utils';
import { toast } from 'sonner';

describe('Toast Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleActionResponse', () => {
    it('should show success toast when response is successful', () => {
      const response = { success: true, message: 'Operation completed' };
      
      handleActionResponse(response);
      
      expect(toast.success).toHaveBeenCalledWith('Operation completed');
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should show error toast when response is not successful', () => {
      const response = { success: false, message: 'Something went wrong' };
      
      handleActionResponse(response);
      
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('should use custom success message when provided', () => {
      const response = { success: true, message: 'Original message' };
      
      handleActionResponse(response, 'Custom success message');
      
      expect(toast.success).toHaveBeenCalledWith('Custom success message');
      expect(toast.success).not.toHaveBeenCalledWith('Original message');
    });

    it('should use custom error message when provided', () => {
      const response = { success: false, message: 'Original error' };
      
      handleActionResponse(response, undefined, 'Custom error message');
      
      expect(toast.error).toHaveBeenCalledWith('Custom error message');
      expect(toast.error).not.toHaveBeenCalledWith('Original error');
    });

    it('should prefer custom messages over default', () => {
      const successResponse = { success: true, message: 'Default' };
      const errorResponse = { success: false, message: 'Default' };
      
      handleActionResponse(successResponse, 'Success!', 'Failed!');
      expect(toast.success).toHaveBeenCalledWith('Success!');
      expect(toast.error).not.toHaveBeenCalled();
      
      vi.clearAllMocks();
      
      handleActionResponse(errorResponse, 'Success!', 'Failed!');
      expect(toast.error).toHaveBeenCalledWith('Failed!');
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('should handle empty message strings', () => {
      const response = { success: true, message: '' };
      
      handleActionResponse(response);
      
      expect(toast.success).toHaveBeenCalledWith('');
    });

    it('should handle response with only success flag', () => {
      // This tests the function signature - it expects at least a message
      const response = { success: true, message: 'Done' };
      
      handleActionResponse(response);
      
      expect(toast.success).toHaveBeenCalledTimes(1);
    });
  });
});
