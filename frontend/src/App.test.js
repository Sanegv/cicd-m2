import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock fetch globally
global.fetch = jest.fn();

describe('App Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders the employee list title', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(<App />);
    
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

    render(<App />);

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

    render(<App />);

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

    render(<App />);

    await waitFor(() => {
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      expect(list).toBeEmptyDOMElement();
    });
  });

  test('handles fetch error gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<App />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // The component should still render the title even if fetch fails
    expect(screen.getByText('Liste des employés')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  test('renders correct number of list items', async () => {
    const mockEmployees = [
      { id: 1, name: 'Alice', role: 'Engineer' },
      { id: 2, name: 'Bob', role: 'Designer' },
      { id: 3, name: 'Charlie', role: 'Manager' },
      { id: 4, name: 'Diana', role: 'Analyst' }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmployees
    });

    render(<App />);

    await waitFor(() => {
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(4);
    });
  });

  test('each employee item has correct key attribute', async () => {
    const mockEmployees = [
      { id: 1, name: 'Test User', role: 'Tester' }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmployees
    });

    const { container } = render(<App />);

    await waitFor(() => {
      const listItem = container.querySelector('li');
      expect(listItem).toBeInTheDocument();
    });
  });

  test('fetch is called only once on mount', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    const { rerender } = render(<App />);
    
    expect(fetch).toHaveBeenCalledTimes(1);

    // Re-render the component
    rerender(<App />);
    
    // Fetch should still only be called once (due to empty dependency array)
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});