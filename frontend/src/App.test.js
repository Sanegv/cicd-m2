import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import App from './App';

global.fetch = jest.fn();
global.confirm = jest.fn();

describe('App Component with CRUD Operations', () => {
  beforeEach(() => {
    fetch.mockClear();
    confirm.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // READ Operations Tests
  describe('READ Operations', () => {
    test('renders the employee list title', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      await act(async () => {
        render(<App />);
      });
      
      expect(screen.getByText('Liste des employés')).toBeInTheDocument();
    });

    test('fetches employees on component mount', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' },
        { id: 2, name: 'Jane Smith', role: 'Designer' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployees
      });

      await act(async () => {
        render(<App />);
      });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('http://localhost:8000/employees');
    });

    test('renders employee list when data is loaded', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' },
        { id: 2, name: 'Jane Smith', role: 'Designer' },
        { id: 3, name: 'Bob Johnson', role: 'Manager' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployees
      });

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      expect(screen.getByText('Jane Smith - Designer')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson - Manager')).toBeInTheDocument();
    });

    test('renders empty list when no employees are returned', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        const list = screen.getByRole('list');
        expect(list).toBeInTheDocument();
        expect(list).toBeEmptyDOMElement();
      });
    });

    test('handles fetch error gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to load employees')).toBeInTheDocument();
      });

      expect(screen.getByText('Liste des employés')).toBeInTheDocument();
      consoleSpy.mockRestore();
    });

    test('handles HTTP error responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to load employees')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  // CREATE Operations Tests
  describe('CREATE Operations', () => {
    test('renders create employee form', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      await act(async () => {
        render(<App />);
      });

      expect(screen.getByText('Ajouter un employé')).toBeInTheDocument();
      expect(screen.getByTestId('create-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('create-role-input')).toBeInTheDocument();
      expect(screen.getByTestId('create-submit-btn')).toBeInTheDocument();
    });

    test('creates new employee successfully', async () => {
      const user = userEvent.setup();
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];
      const newEmployee = { id: 2, name: 'Jane Smith', role: 'Designer' };

      // Mock initial fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployees
      });

      // Mock create employee
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newEmployee
      });

      await act(async () => {
        render(<App />);
      });

      // Fill form
      await user.type(screen.getByTestId('create-name-input'), 'Jane Smith');
      await user.type(screen.getByTestId('create-role-input'), 'Designer');

      // Submit form
      await user.click(screen.getByTestId('create-submit-btn'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/employees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Jane Smith', role: 'Designer' }),
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Jane Smith - Designer')).toBeInTheDocument();
      });
    });

    test('shows error when creating employee with empty fields', async () => {
      const user = userEvent.setup();

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      await act(async () => {
        render(<App />);
      });

      await user.click(screen.getByTestId('create-submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Name and role are required')).toBeInTheDocument();
      });
    });

    test('handles create employee error', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        render(<App />);
      });

      await user.type(screen.getByTestId('create-name-input'), 'John Doe');
      await user.type(screen.getByTestId('create-role-input'), 'Developer');
      await user.click(screen.getByTestId('create-submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Failed to create employee')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test('clears form after successful creation', async () => {
      const user = userEvent.setup();
      const newEmployee = { id: 1, name: 'John Doe', role: 'Developer' };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newEmployee
      });

      await act(async () => {
        render(<App />);
      });

      await user.type(screen.getByTestId('create-name-input'), 'John Doe');
      await user.type(screen.getByTestId('create-role-input'), 'Developer');
      await user.click(screen.getByTestId('create-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('create-name-input')).toHaveValue('');
        expect(screen.getByTestId('create-role-input')).toHaveValue('');
      });
    });
  });

  // UPDATE Operations Tests
  describe('UPDATE Operations', () => {
    test('opens edit form when edit button is clicked', async () => {
      const user = userEvent.setup();
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployees
      });

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('edit-btn-1'));

      expect(screen.getByText('Modifier l\'employé')).toBeInTheDocument();
      expect(screen.getByTestId('edit-name-input')).toHaveValue('John Doe');
      expect(screen.getByTestId('edit-role-input')).toHaveValue('Developer');
    });

    test('updates employee successfully', async () => {
      const user = userEvent.setup();
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];
      const updatedEmployee = { id: 1, name: 'John Smith', role: 'Senior Developer' };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployees
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedEmployee
      });

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('edit-btn-1'));

      await user.clear(screen.getByTestId('edit-name-input'));
      await user.type(screen.getByTestId('edit-name-input'), 'John Smith');
      await user.clear(screen.getByTestId('edit-role-input'));
      await user.type(screen.getByTestId('edit-role-input'), 'Senior Developer');

      await user.click(screen.getByTestId('edit-submit-btn'));

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
    });

    test('cancels edit operation', async () => {
      const user = userEvent.setup();
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployees
      });

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('edit-btn-1'));

      expect(screen.getByText('Modifier l\'employé')).toBeInTheDocument();

      await user.click(screen.getByTestId('edit-cancel-btn'));

      expect(screen.queryByText('Modifier l\'employé')).not.toBeInTheDocument();
    });

    test('shows error when updating employee with empty fields', async () => {
      const user = userEvent.setup();
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployees
      });

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('edit-btn-1'));

      await user.clear(screen.getByTestId('edit-name-input'));
      await user.clear(screen.getByTestId('edit-role-input'));

      await user.click(screen.getByTestId('edit-submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Name and role are required')).toBeInTheDocument();
      });
    });

    test('handles update employee error', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployees
      });

      fetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('edit-btn-1'));
      await user.click(screen.getByTestId('edit-submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Failed to update employee')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  // DELETE Operations Tests
  describe('DELETE Operations', () => {
    test('deletes employee when confirmed', async () => {
      const user = userEvent.setup();
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' },
        { id: 2, name: 'Jane Smith', role: 'Designer' }
      ];

      confirm.mockReturnValueOnce(true);

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployees
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('delete-btn-1'));

      expect(confirm).toHaveBeenCalledWith('Are you sure you want to delete this employee?');

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/employees/1', {
          method: 'DELETE'
        });
      });

      await waitFor(() => {
        expect(screen.queryByText('John Doe - Developer')).not.toBeInTheDocument();
      });
    });

    test('does not delete employee when cancelled', async () => {
      const user = userEvent.setup();
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      confirm.mockReturnValueOnce(false);

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployees
      });

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('delete-btn-1'));

      expect(confirm).toHaveBeenCalledWith('Are you sure you want to delete this employee?');
      expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
    });

    test('handles delete employee error', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockEmployees = [
        { id: 1, name: 'John Doe', role: 'Developer' }
      ];

      confirm.mockReturnValueOnce(true);

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployees
      });

      fetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('delete-btn-1'));

      await waitFor(() => {
        expect(screen.getByText('Failed to delete employee')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  // Loading and Error States Tests
  describe('Loading and Error States', () => {
    test('shows loading state during operations', async () => {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      fetch.mockReturnValueOnce(promise);

      await act(async () => {
        render(<App />);
      });

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

    test('disables buttons during loading', async () => {
      const user = userEvent.setup();
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      fetch.mockReturnValueOnce(promise);

      await act(async () => {
        render(<App />);
      });

      await user.type(screen.getByTestId('create-name-input'), 'John Doe');
      await user.type(screen.getByTestId('create-role-input'), 'Developer');
      await user.click(screen.getByTestId('create-submit-btn'));

      expect(screen.getByTestId('create-submit-btn')).toBeDisabled();

      await act(async () => {
        resolvePromise({
          ok: true,
          json: async () => ({ id: 1, name: 'John Doe', role: 'Developer' })
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('create-submit-btn')).not.toBeDisabled();
      });
    });
  });

  // Integration Tests
  describe('Integration Tests', () => {
    test('performs complete CRUD cycle', async () => {
      const user = userEvent.setup();
      
      // Initial empty list
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      // Create employee
      const newEmployee = { id: 1, name: 'John Doe', role: 'Developer' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newEmployee
      });

      // Update employee
      const updatedEmployee = { id: 1, name: 'John Smith', role: 'Senior Developer' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedEmployee
      });

      // Delete employee
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await act(async () => {
        render(<App />);
      });

      // Create
      await user.type(screen.getByTestId('create-name-input'), 'John Doe');
      await user.type(screen.getByTestId('create-role-input'), 'Developer');
      await user.click(screen.getByTestId('create-submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('John Doe - Developer')).toBeInTheDocument();
      });

      // Update
      await user.click(screen.getByTestId('edit-btn-1'));
      await user.clear(screen.getByTestId('edit-name-input'));
      await user.type(screen.getByTestId('edit-name-input'), 'John Smith');
      await user.clear(screen.getByTestId('edit-role-input'));
      await user.type(screen.getByTestId('edit-role-input'), 'Senior Developer');
      await user.click(screen.getByTestId('edit-submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('John Smith - Senior Developer')).toBeInTheDocument();
      });

      // Delete
      confirm.mockReturnValueOnce(true);
      await user.click(screen.getByTestId('delete-btn-1'));

      await waitFor(() => {
        expect(screen.queryByText('John Smith - Senior Developer')).not.toBeInTheDocument();
      });
    });
  });
});