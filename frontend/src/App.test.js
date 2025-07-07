import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import App from './App';

// Mock fetch and confirm globally
global.fetch = jest.fn();
global.confirm = jest.fn();

describe('App Component with CRUD Operations', () => {
  beforeEach(() => {
    // Clear all mocks
    fetch.mockClear();
    confirm.mockClear();
    
    // Clear any console.error mocks
    if (console.error.mockRestore) {
      console.error.mockRestore();
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper function to mock successful employee fetch
  const mockEmployeesFetch = (employees = []) => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => employees
    });
  };

  // Helper function to mock successful create/update/delete
  const mockSuccessfulOperation = (data = {}) => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => data
    });
  };

  // Helper function to mock network error
  const mockNetworkError = (errorMessage = 'Network error') => {
    fetch.mockRejectedValueOnce(new Error(errorMessage));
  };

  // Helper function to mock HTTP error
  const mockHttpError = (status = 500) => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status
    });
  };

  // READ Operations Tests
  describe('READ Operations', () => {
    test('renders the employee list title', async () => {
      mockEmployeesFetch();

      render(<App />);
      
      expect(screen.getByText('Liste des employés')).toBeInTheDocument();
    });

    test('fetches employees on component mount', async () => {
      mockEmployeesFetch();

      render(<App />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1);
      });
      
      expect(fetch).toHaveBeenCalledWith('http://localhost:8000/employees');
    });

    test('renders empty list when no employees are returned', async () => {
      mockEmployeesFetch([]);

      render(<App />);

      await waitFor(() => {
        const list = screen.getByRole('list');
        expect(list).toBeInTheDocument();
        expect(list).toBeEmptyDOMElement();
      });
    });

    test('handles fetch error gracefully', async () => {
      mockNetworkError();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load employees')).toBeInTheDocument();
      });

      expect(screen.getByText('Liste des employés')).toBeInTheDocument();
      consoleSpy.mockRestore();
    });

    test('handles HTTP error responses', async () => {
      mockHttpError(500);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load employees')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  // CREATE Operations Tests
  describe('CREATE Operations', () => {
    test('renders create employee form', async () => {
      mockEmployeesFetch();

      render(<App />);

      expect(screen.getByText('Ajouter un employé')).toBeInTheDocument();
      expect(screen.getByTestId('create-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('create-role-input')).toBeInTheDocument();
      expect(screen.getByTestId('create-submit-btn')).toBeInTheDocument();
    });

    test('creates new employee successfully', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];
      const newEmployee = { id: 2, name: 'Jane Smith', role: 'Designer' };

      mockEmployeesFetch(mockEmployees);
      mockSuccessfulOperation(newEmployee);

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      // Fill and submit form
      await userEvent.type(screen.getByTestId('create-name-input'), 'Jane Smith');
      await userEvent.type(screen.getByTestId('create-role-input'), 'Designer');
      await userEvent.click(screen.getByTestId('create-submit-btn'));

      // Verify API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/employees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Jane Smith', role: 'Designer' }),
        });
      });

      // Verify new employee appears in list
      await waitFor(() => {
        expect(screen.getByText('Jane Smith - Designer')).toBeInTheDocument();
      });
    });

    

    test('clears form after successful creation', async () => {
      const newEmployee = { id: 1, name: 'John Doe', role: 'Developer' };

      mockEmployeesFetch();
      mockSuccessfulOperation(newEmployee);

      render(<App />);

      await userEvent.type(screen.getByTestId('create-name-input'), 'John Doe');
      await userEvent.type(screen.getByTestId('create-role-input'), 'Developer');
      await userEvent.click(screen.getByTestId('create-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('create-name-input')).toHaveValue('');
        expect(screen.getByTestId('create-role-input')).toHaveValue('');
      });
    });

  });

  // UPDATE Operations Tests
  describe('UPDATE Operations', () => {
    test('opens edit form when edit button is clicked', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      mockEmployeesFetch(mockEmployees);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('edit-btn-1'));

      expect(screen.getByText('Modifier l\'employé')).toBeInTheDocument();
      expect(screen.getByTestId('edit-name-input')).toHaveValue('John Doe');
      expect(screen.getByTestId('edit-role-input')).toHaveValue('Developer');
    });

    test('updates employee successfully', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];
      const updatedEmployee = { id: 1, name: 'John Smith', role: 'Senior Developer' };

      mockEmployeesFetch(mockEmployees);
      mockSuccessfulOperation(updatedEmployee);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('edit-btn-1'));

      await userEvent.clear(screen.getByTestId('edit-name-input'));
      await userEvent.type(screen.getByTestId('edit-name-input'), 'John Smith');
      await userEvent.clear(screen.getByTestId('edit-role-input'));
      await userEvent.type(screen.getByTestId('edit-role-input'), 'Senior Developer');

      await userEvent.click(screen.getByTestId('edit-submit-btn'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/employees/1', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: 1, name: 'John Smith', role: 'Senior Developer' }),
        });
      });

      await waitFor(() => {
        expect(screen.getByText('John Smith - Senior Developer')).toBeInTheDocument();
      });

      // Edit form should be hidden after successful update
      expect(screen.queryByText('Modifier l\'employé')).not.toBeInTheDocument();
    });

    test('cancels edit operation', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      mockEmployeesFetch(mockEmployees);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('edit-btn-1'));

      expect(screen.getByText('Modifier l\'employé')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('edit-cancel-btn'));

      expect(screen.queryByText('Modifier l\'employé')).not.toBeInTheDocument();
    });

    test('shows error when updating employee with empty name', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      mockEmployeesFetch(mockEmployees);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('edit-btn-1'));

      await userEvent.clear(screen.getByTestId('edit-name-input'));
      await userEvent.click(screen.getByTestId('edit-submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Name and role are required')).toBeInTheDocument();
      });
    });

    test('shows error when updating employee with empty role', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      mockEmployeesFetch(mockEmployees);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('edit-btn-1'));

      await userEvent.clear(screen.getByTestId('edit-role-input'));
      await userEvent.click(screen.getByTestId('edit-submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Name and role are required')).toBeInTheDocument();
      });
    });

    test('handles update employee network error', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      mockEmployeesFetch(mockEmployees);
      mockNetworkError();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('edit-btn-1'));
      await userEvent.click(screen.getByTestId('edit-submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Failed to update employee')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test('handles update employee HTTP error', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      mockEmployeesFetch(mockEmployees);
      mockHttpError(400);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('edit-btn-1'));
      await userEvent.click(screen.getByTestId('edit-submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Failed to update employee')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test('clears error message when canceling edit', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      mockEmployeesFetch(mockEmployees);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('edit-btn-1'));
      
      // Trigger validation error
      await userEvent.clear(screen.getByTestId('edit-name-input'));
      await userEvent.click(screen.getByTestId('edit-submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Name and role are required')).toBeInTheDocument();
      });

      // Cancel edit
      await userEvent.click(screen.getByTestId('edit-cancel-btn'));

      // Error should be cleared
      expect(screen.queryByText('Name and role are required')).not.toBeInTheDocument();
    });
  });

  // DELETE Operations Tests
  describe('DELETE Operations', () => {
    test('deletes employee when confirmed', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' },
        { id: 2, name: 'Jane Smith', role: 'Designer' }
      ];

      confirm.mockReturnValueOnce(true);
      mockEmployeesFetch(mockEmployees);
      mockSuccessfulOperation({});

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('delete-btn-1'));

      expect(confirm).toHaveBeenCalledWith('Are you sure you want to delete this employee?');

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/employees/1', {
          method: 'DELETE'
        });
      });

      await waitFor(() => {
        expect(screen.queryByText('John Doe - Developer')).not.toBeInTheDocument();
      });

      // Other employee should still be there
      expect(screen.getByText('Jane Smith - Designer')).toBeInTheDocument();
    });

    test('does not delete employee when cancelled', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      confirm.mockReturnValueOnce(false);
      mockEmployeesFetch(mockEmployees);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('delete-btn-1'));

      expect(confirm).toHaveBeenCalledWith('Are you sure you want to delete this employee?');
      expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      
      // Should not make delete API call
      expect(fetch).toHaveBeenCalledTimes(1); // Only initial fetch
    });

    test('handles delete employee network error', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      confirm.mockReturnValueOnce(true);
      mockEmployeesFetch(mockEmployees);
      mockNetworkError();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('delete-btn-1'));

      await waitFor(() => {
        expect(screen.getByText('Failed to delete employee')).toBeInTheDocument();
      });

      // Employee should still be there
      expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test('handles delete employee HTTP error', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      confirm.mockReturnValueOnce(true);
      mockEmployeesFetch(mockEmployees);
      mockHttpError(404);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('delete-btn-1'));

      await waitFor(() => {
        expect(screen.getByText('Failed to delete employee')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  // Loading and Error States Tests
  describe('Loading and Error States', () => {
    test('shows loading state during initial fetch', async () => {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      fetch.mockReturnValueOnce(promise);

      render(<App />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      await act(async () => {
        resolvePromise({
          ok: true,
          json: async () => []
        });
      });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    test('disables buttons during create operation', async () => {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockEmployeesFetch();
      fetch.mockReturnValueOnce(promise);

      render(<App />);

      await userEvent.type(screen.getByTestId('create-name-input'), 'John Doe');
      await userEvent.type(screen.getByTestId('create-role-input'), 'Developer');
      await userEvent.click(screen.getByTestId('create-submit-btn'));

      expect(screen.getByTestId('create-submit-btn')).toBeDisabled();
      expect(screen.getByTestId('create-name-input')).toBeDisabled();
      expect(screen.getByTestId('create-role-input')).toBeDisabled();

      await act(async () => {
        resolvePromise({
          ok: true,
          json: async () => ({ id: 1, name: 'John Doe', role: 'Developer' })
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('create-submit-btn')).not.toBeDisabled();
        expect(screen.getByTestId('create-name-input')).not.toBeDisabled();
        expect(screen.getByTestId('create-role-input')).not.toBeDisabled();
      });
    });

    test('disables buttons during update operation', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockEmployeesFetch(mockEmployees);
      fetch.mockReturnValueOnce(promise);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('edit-btn-1'));
      await userEvent.click(screen.getByTestId('edit-submit-btn'));

      expect(screen.getByTestId('edit-submit-btn')).toBeDisabled();
      expect(screen.getByTestId('edit-cancel-btn')).toBeDisabled();
      expect(screen.getByTestId('edit-name-input')).toBeDisabled();
      expect(screen.getByTestId('edit-role-input')).toBeDisabled();

      await act(async () => {
        resolvePromise({
          ok: true,
          json: async () => ({ id: 1, name: 'John Doe', role: 'Developer' })
        });
      });

      await waitFor(() => {
        expect(screen.queryByText('Modifier l\'employé')).not.toBeInTheDocument();
      });
    });

    test('disables buttons during delete operation', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      confirm.mockReturnValueOnce(true);
      mockEmployeesFetch(mockEmployees);
      fetch.mockReturnValueOnce(promise);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('delete-btn-1'));

      expect(screen.getByTestId('edit-btn-1')).toBeDisabled();
      expect(screen.getByTestId('delete-btn-1')).toBeDisabled();

      await act(async () => {
        resolvePromise({
          ok: true,
          json: async () => ({})
        });
      });

      await waitFor(() => {
        expect(screen.queryByText('John Doe - Developer')).not.toBeInTheDocument();
      });
    });
  });

  // Integration Tests
  describe('Integration Tests', () => {

    test('handles multiple employees correctly', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' },
        { id: 2, name: 'Jane Smith', role: 'Designer' },
        { id: 3, name: 'Bob Johnson', role: 'Manager' }
      ];

      mockEmployeesFetch(mockEmployees);

      render(<App />);

      // Wait for all employees to be rendered
      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith - Designer')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson - Manager')).toBeInTheDocument();
      });

      // Each employee should have their own edit and delete buttons
      expect(screen.getByTestId('edit-btn-1')).toBeInTheDocument();
      expect(screen.getByTestId('delete-btn-1')).toBeInTheDocument();
      expect(screen.getByTestId('edit-btn-2')).toBeInTheDocument();
      expect(screen.getByTestId('delete-btn-2')).toBeInTheDocument();
      expect(screen.getByTestId('edit-btn-3')).toBeInTheDocument();
      expect(screen.getByTestId('delete-btn-3')).toBeInTheDocument();
    });
  });
});