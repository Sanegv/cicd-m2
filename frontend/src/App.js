import React, { useEffect, useState } from 'react';

function App() {
  const [employees, setEmployees] = useState([]);
  const [newEmployee, setNewEmployee] = useState({ name: '', role: '' });
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get API URL from environment variable, fallback to localhost
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:80';

  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/employees`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setError('Failed to load employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Create new employee
  const createEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployee.name.trim() || !newEmployee.role.trim()) {
      setError('Name and role are required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEmployee),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const createdEmployee = await response.json();
      setEmployees([...employees, createdEmployee]);
      setNewEmployee({ name: '', role: '' });
    } catch (error) {
      console.error('Failed to create employee:', error);
      setError('Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  // Update employee
  const updateEmployee = async (e) => {
    e.preventDefault();
    if (!editingEmployee.name.trim() || !editingEmployee.role.trim()) {
      setError('Name and role are required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/employees/${editingEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingEmployee),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedEmployee = await response.json();
      setEmployees(employees.map(emp => 
        emp.id === editingEmployee.id ? updatedEmployee : emp
      ));
      setEditingEmployee(null);
    } catch (error) {
      console.error('Failed to update employee:', error);
      setError('Failed to update employee');
    } finally {
      setLoading(false);
    }
  };

  // Delete employee
  const deleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/employees/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setEmployees(employees.filter(emp => emp.id !== id));
    } catch (error) {
      console.error('Failed to delete employee:', error);
      setError('Failed to delete employee');
    } finally {
      setLoading(false);
    }
  };

  // Start editing an employee
  const startEditing = (employee) => {
    setEditingEmployee({ ...employee });
    setError('');
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingEmployee(null);
    setError('');
  };

  // Handle name input change for create form - clear error when typing
  const handleNameChange = (e) => {
    setNewEmployee({ ...newEmployee, name: e.target.value });
    if (error) {
      setError('');
    }
  };

  // Handle role input change for create form - clear error when typing
  const handleRoleChange = (e) => {
    setNewEmployee({ ...newEmployee, role: e.target.value });
    if (error) {
      setError('');
    }
  };

  // Handle name input change for edit form - clear error when typing
  const handleEditNameChange = (e) => {
    setEditingEmployee({ ...editingEmployee, name: e.target.value });
    if (error) {
      setError('');
    }
  };

  // Handle role input change for edit form - clear error when typing
  const handleEditRoleChange = (e) => {
    setEditingEmployee({ ...editingEmployee, role: e.target.value });
    if (error) {
      setError('');
    }
  };

  return (
    <div>
      <h1>Liste des employés</h1>
      
      {/* Error message display - THIS WAS MISSING FROM YOUR ORIGINAL CODE */}
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      
      {loading && <div>Loading...</div>}

      {/* Create Employee Form */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>Ajouter un employé</h3>
        <form onSubmit={createEmployee}>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Nom"
              value={newEmployee.name}
              onChange={handleNameChange}
              disabled={loading}
              data-testid="create-name-input"
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Rôle"
              value={newEmployee.role}
              onChange={handleRoleChange}
              disabled={loading}
              data-testid="create-role-input"
            />
          </div>
          <button type="submit" disabled={loading} data-testid="create-submit-btn">
            Ajouter
          </button>
        </form>
      </div>

      {/* Edit Employee Form */}
      {editingEmployee && (
        <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #orange' }}>
          <h3>Modifier l'employé</h3>
          <form onSubmit={updateEmployee}>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Nom"
                value={editingEmployee.name}
                onChange={handleEditNameChange}
                disabled={loading}
                data-testid="edit-name-input"
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Rôle"
                value={editingEmployee.role}
                onChange={handleEditRoleChange}
                disabled={loading}
                data-testid="edit-role-input"
              />
            </div>
            <button type="submit" disabled={loading} data-testid="edit-submit-btn">
              Mettre à jour
            </button>
            <button type="button" onClick={cancelEditing} disabled={loading} data-testid="edit-cancel-btn">
              Annuler
            </button>
          </form>
        </div>
      )}

      {/* Employee List */}
      <ul>
        {employees.map((emp) => (
          <li key={emp.id} style={{ marginBottom: '10px', padding: '5px', border: '1px solid #eee' }}>
            <span>{emp.name} - {emp.role}</span>
            <div style={{ marginTop: '5px' }}>
              <button 
                onClick={() => startEditing(emp)} 
                disabled={loading}
                data-testid={`edit-btn-${emp.id}`}
                style={{ marginRight: '5px' }}
              >
                Modifier
              </button>
              <button 
                onClick={() => deleteEmployee(emp.id)} 
                disabled={loading}
                data-testid={`delete-btn-${emp.id}`}
                style={{ color: 'red' }}
              >
                Supprimer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;