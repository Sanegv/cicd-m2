import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import HTTPException
import psycopg2

# Import de l'application
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'app'))
from main import app, get_connection, Employee, EmployeeCreate, EmployeeUpdate


class TestEmployeeAPI:
    """Classe de tests pour l'API Employee"""
    
    def setup_method(self):
        """Configuration avant chaque test"""
        self.client = TestClient(app)
        
    def test_root_endpoint(self):
        """Test de l'endpoint racine"""
        response = self.client.get("/")
        assert response.status_code == 200
        assert response.json() == "Bonjour"
        
    @patch('main.get_connection')
    def test_get_employees_success(self, mock_get_connection):
        """Test de récupération des employés avec succès"""
        # Mock de la connexion et du curseur
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Données simulées de la base de données
        mock_cursor.fetchall.return_value = [
            (1, "Alice Dupont", "Développeur"),
            (2, "Bob Martin", "Designer"),
            (3, "Claire Moreau", "Manager")
        ]
        
        # Appel de l'endpoint
        response = self.client.get("/employees")
        
        # Vérifications
        assert response.status_code == 200
        employees = response.json()
        assert len(employees) == 3
        
        # Vérification des données
        assert employees[0] == {"id": 1, "name": "Alice Dupont", "role": "Développeur"}
        assert employees[1] == {"id": 2, "name": "Bob Martin", "role": "Designer"}
        assert employees[2] == {"id": 3, "name": "Claire Moreau", "role": "Manager"}
        
        # Vérification que les méthodes ont été appelées
        mock_get_connection.assert_called_once()
        mock_conn.cursor.assert_called_once()
        mock_cursor.execute.assert_called_once_with("SELECT id, name, role FROM employees ORDER BY id;")
        mock_cursor.fetchall.assert_called_once()
        mock_cursor.close.assert_called_once()
        mock_conn.close.assert_called_once()
        
    @patch('main.get_connection')
    def test_get_employees_empty_result(self, mock_get_connection):
        """Test de récupération d'employés avec résultat vide"""
        # Mock de la connexion et du curseur
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Aucun employé dans la base
        mock_cursor.fetchall.return_value = []
        
        # Appel de l'endpoint
        response = self.client.get("/employees")
        
        # Vérifications
        assert response.status_code == 200
        employees = response.json()
        assert len(employees) == 0
        assert employees == []
        
    @patch('main.get_connection')
    def test_get_employees_database_error(self, mock_get_connection):
        """Test d'erreur de base de données lors de la récupération"""
        # Mock qui lève une exception
        mock_get_connection.side_effect = psycopg2.Error("Erreur de connexion")
        
        # Appel de l'endpoint
        response = self.client.get("/employees")
        
        # Vérifications
        assert response.status_code == 500
        assert "Erreur de connexion" in response.json()["detail"]
        
    @patch('main.get_connection')
    def test_get_employee_success(self, mock_get_connection):
        """Test de récupération d'un employé spécifique avec succès"""
        # Mock de la connexion et du curseur
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Données simulées de la base de données
        mock_cursor.fetchone.return_value = (1, "Alice Dupont", "Développeur")
        
        # Appel de l'endpoint
        response = self.client.get("/employees/1")
        
        # Vérifications
        assert response.status_code == 200
        employee = response.json()
        assert employee == {"id": 1, "name": "Alice Dupont", "role": "Développeur"}
        
        # Vérification que les méthodes ont été appelées
        mock_get_connection.assert_called_once()
        mock_conn.cursor.assert_called_once()
        mock_cursor.execute.assert_called_once_with("SELECT id, name, role FROM employees WHERE id = %s;", (1,))
        mock_cursor.fetchone.assert_called_once()
        mock_cursor.close.assert_called_once()
        mock_conn.close.assert_called_once()
        
    @patch('main.get_connection')
    def test_get_employee_not_found(self, mock_get_connection):
        """Test de récupération d'un employé inexistant"""
        # Mock de la connexion et du curseur
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Aucun employé trouvé
        mock_cursor.fetchone.return_value = None
        
        # Appel de l'endpoint
        response = self.client.get("/employees/999")
        
        # Vérifications
        assert response.status_code == 404
        assert "Employee not found" in response.json()["detail"]
        
    @patch('main.get_connection')
    def test_add_employee_success(self, mock_get_connection):
        """Test d'ajout d'employé avec succès"""
        # Mock de la connexion et du curseur
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Mock du retour de l'ID généré
        mock_cursor.fetchone.return_value = (4,)
        
        # Données de l'employé à ajouter (sans ID)
        employee_data = {
            "name": "David Leroy",
            "role": "Testeur"
        }
        
        # Appel de l'endpoint
        response = self.client.post("/employees", json=employee_data)
        
        # Vérifications
        assert response.status_code == 200
        returned_employee = response.json()
        assert returned_employee == {"id": 4, "name": "David Leroy", "role": "Testeur"}
        
        # Vérification que les méthodes ont été appelées
        mock_get_connection.assert_called_once()
        mock_conn.cursor.assert_called_once()
        mock_cursor.execute.assert_called_once_with(
            "INSERT INTO employees (name, role) VALUES (%s, %s) RETURNING id;",
            ("David Leroy", "Testeur")
        )
        mock_cursor.fetchone.assert_called_once()
        mock_conn.commit.assert_called_once()
        mock_cursor.close.assert_called_once()
        mock_conn.close.assert_called_once()
        
    @patch('main.get_connection')
    def test_add_employee_database_error(self, mock_get_connection):
        """Test d'erreur de base de données lors de l'ajout"""
        # Mock qui lève une exception
        mock_get_connection.side_effect = psycopg2.Error("Erreur de connexion")
        
        # Données de l'employé à ajouter
        employee_data = {
            "name": "Emma Bernard",
            "role": "Analyste"
        }
        
        # Appel de l'endpoint
        response = self.client.post("/employees", json=employee_data)
        
        # Vérifications
        assert response.status_code == 500
        assert "Erreur de connexion" in response.json()["detail"]
        
    @patch('main.get_connection')
    def test_add_employee_insert_error(self, mock_get_connection):
        """Test d'erreur lors de l'insertion"""
        # Mock de la connexion
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Le curseur lève une exception lors de l'insertion
        mock_cursor.execute.side_effect = psycopg2.IntegrityError("Violation de contrainte")
        
        # Données de l'employé à ajouter
        employee_data = {
            "name": "Test User",
            "role": "Test Role"
        }
        
        # Appel de l'endpoint
        response = self.client.post("/employees", json=employee_data)
        
        # Vérifications
        assert response.status_code == 500
        assert "Violation de contrainte" in response.json()["detail"]
        # Vérification que rollback a été appelé
        mock_conn.rollback.assert_called_once()
        
    @patch('main.get_connection')
    def test_update_employee_success(self, mock_get_connection):
        """Test de mise à jour d'employé avec succès"""
        # Mock de la connexion et du curseur
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Mock pour vérifier que l'employé existe
        mock_cursor.fetchone.return_value = (1,)
        
        # Données de mise à jour
        update_data = {
            "name": "Alice Dupont Updated",
            "role": "Senior Développeur"
        }
        
        # Appel de l'endpoint
        response = self.client.put("/employees/1", json=update_data)
        
        # Vérifications
        assert response.status_code == 200
        updated_employee = response.json()
        assert updated_employee == {"id": 1, "name": "Alice Dupont Updated", "role": "Senior Développeur"}
        
        # Vérification que les méthodes ont été appelées
        mock_get_connection.assert_called_once()
        mock_conn.cursor.assert_called_once()
        # Vérifier que deux requêtes ont été exécutées (SELECT puis UPDATE)
        assert mock_cursor.execute.call_count == 2
        mock_conn.commit.assert_called_once()
        mock_cursor.close.assert_called_once()
        mock_conn.close.assert_called_once()
        
    @patch('main.get_connection')
    def test_update_employee_not_found(self, mock_get_connection):
        """Test de mise à jour d'un employé inexistant"""
        # Mock de la connexion et du curseur
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Aucun employé trouvé
        mock_cursor.fetchone.return_value = None
        
        # Données de mise à jour
        update_data = {
            "name": "Test User",
            "role": "Test Role"
        }
        
        # Appel de l'endpoint
        response = self.client.put("/employees/999", json=update_data)
        
        # Vérifications
        assert response.status_code == 404
        assert "Employee not found" in response.json()["detail"]
        
    @patch('main.get_connection')
    def test_delete_employee_success(self, mock_get_connection):
        """Test de suppression d'employé avec succès"""
        # Mock de la connexion et du curseur
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Mock pour vérifier que l'employé existe
        mock_cursor.fetchone.return_value = (1,)
        
        # Appel de l'endpoint
        response = self.client.delete("/employees/1")
        
        # Vérifications
        assert response.status_code == 200
        assert response.json() == {"message": "Employee deleted successfully"}
        
        # Vérification que les méthodes ont été appelées
        mock_get_connection.assert_called_once()
        mock_conn.cursor.assert_called_once()
        # Vérifier que deux requêtes ont été exécutées (SELECT puis DELETE)
        assert mock_cursor.execute.call_count == 2
        mock_conn.commit.assert_called_once()
        mock_cursor.close.assert_called_once()
        mock_conn.close.assert_called_once()
        
    @patch('main.get_connection')
    def test_delete_employee_not_found(self, mock_get_connection):
        """Test de suppression d'un employé inexistant"""
        # Mock de la connexion et du curseur
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Aucun employé trouvé
        mock_cursor.fetchone.return_value = None
        
        # Appel de l'endpoint
        response = self.client.delete("/employees/999")
        
        # Vérifications
        assert response.status_code == 404
        assert "Employee not found" in response.json()["detail"]
        
    def test_add_employee_invalid_data(self):
        """Test d'ajout d'employé avec données invalides"""
        # Données invalides (champ manquant)
        invalid_data = {
            "name": "Test User"
            # "role" manquant
        }
        
        # Appel de l'endpoint
        response = self.client.post("/employees", json=invalid_data)
        
        # Vérifications
        assert response.status_code == 422  # Validation error
        
    def test_add_employee_invalid_types(self):
        """Test d'ajout d'employé avec types invalides"""
        # Données avec types invalides
        invalid_data = {
            "name": 123,  # Devrait être une string
            "role": "Test Role"
        }
        
        # Appel de l'endpoint
        response = self.client.post("/employees", json=invalid_data)
        
        # Vérifications
        assert response.status_code == 422  # Validation error
        
    def test_update_employee_invalid_data(self):
        """Test de mise à jour d'employé avec données invalides"""
        # Données invalides (champ manquant)
        invalid_data = {
            "name": "Test User"
            # "role" manquant
        }
        
        # Appel de l'endpoint
        response = self.client.put("/employees/1", json=invalid_data)
        
        # Vérifications
        assert response.status_code == 422  # Validation error
        
    @patch('main.os.getenv')
    @patch('main.psycopg2.connect')
    def test_get_connection_default_values(self, mock_connect, mock_getenv):
        """Test de la fonction get_connection avec valeurs par défaut"""
        # Mock des variables d'environnement
        mock_getenv.side_effect = lambda key, default: default
        
        # Appel de la fonction
        get_connection()
        
        # Vérifications
        mock_connect.assert_called_once_with(
            host="localhost",
            dbname="employeesdb",
            user="postgres",
            password="postgres"
        )
        
    @patch('main.get_connection')
    def test_get_employees_connection_cleanup_on_error(self, mock_get_connection):
        """Test de nettoyage des connexions en cas d'erreur"""
        # Mock de la connexion
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Le fetchall lève une exception
        mock_cursor.fetchall.side_effect = Exception("Erreur de lecture")
        
        # Appel de l'endpoint
        response = self.client.get("/employees")
        
        # Vérifications que les ressources sont nettoyées même en cas d'erreur
        assert response.status_code == 500
        mock_cursor.close.assert_called_once()
        mock_conn.close.assert_called_once()
        
    @patch('main.get_connection')
    def test_add_employee_connection_cleanup_on_error(self, mock_get_connection):
        """Test de nettoyage des connexions en cas d'erreur lors de l'ajout"""
        # Mock de la connexion
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Le commit lève une exception
        mock_conn.commit.side_effect = Exception("Erreur de commit")
        
        # Données de l'employé à ajouter
        employee_data = {
            "name": "Test User",
            "role": "Test Role"
        }
        
        # Appel de l'endpoint
        response = self.client.post("/employees", json=employee_data)
        
        # Vérifications que les ressources sont nettoyées même en cas d'erreur
        assert response.status_code == 500
        mock_cursor.close.assert_called_once()
        mock_conn.close.assert_called_once()
        
    @patch('main.get_connection')
    def test_update_employee_connection_cleanup_on_error(self, mock_get_connection):
        """Test de nettoyage des connexions en cas d'erreur lors de la mise à jour"""
        # Mock de la connexion
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # L'employé existe
        mock_cursor.fetchone.return_value = (1,)
        # Le commit lève une exception
        mock_conn.commit.side_effect = Exception("Erreur de commit")
        
        # Données de mise à jour
        update_data = {
            "name": "Test User",
            "role": "Test Role"
        }
        
        # Appel de l'endpoint
        response = self.client.put("/employees/1", json=update_data)
        
        # Vérifications que les ressources sont nettoyées même en cas d'erreur
        assert response.status_code == 500
        mock_cursor.close.assert_called_once()
        mock_conn.close.assert_called_once()
        mock_conn.rollback.assert_called_once()


class TestEmployeeModels:
    """Tests pour les modèles Employee"""
    
    def test_employee_model_creation(self):
        """Test de création d'un objet Employee"""
        employee = Employee(id=1, name="Test User", role="Test Role")
        
        assert employee.id == 1
        assert employee.name == "Test User"
        assert employee.role == "Test Role"
        
    def test_employee_model_optional_id(self):
        """Test de création d'un objet Employee sans ID"""
        employee = Employee(name="Test User", role="Test Role")
        
        assert employee.id is None
        assert employee.name == "Test User"
        assert employee.role == "Test Role"
        
    def test_employee_create_model(self):
        """Test du modèle EmployeeCreate"""
        employee_create = EmployeeCreate(name="Test User", role="Test Role")
        
        assert employee_create.name == "Test User"
        assert employee_create.role == "Test Role"
        
    def test_employee_update_model(self):
        """Test du modèle EmployeeUpdate"""
        employee_update = EmployeeUpdate(name="Updated User", role="Updated Role")
        
        assert employee_update.name == "Updated User"
        assert employee_update.role == "Updated Role"
        
    def test_employee_model_validation(self):
        """Test de validation du modèle Employee"""
        # Test avec données valides
        valid_data = {"id": 1, "name": "Test User", "role": "Test Role"}
        employee = Employee(**valid_data)
        
        assert employee.id == 1
        assert employee.name == "Test User"
        assert employee.role == "Test Role"
        
    def test_employee_create_model_validation(self):
        """Test de validation du modèle EmployeeCreate"""
        # Test avec données valides
        valid_data = {"name": "Test User", "role": "Test Role"}
        employee_create = EmployeeCreate(**valid_data)
        
        assert employee_create.name == "Test User"
        assert employee_create.role == "Test Role"
        
    def test_employee_model_invalid_data(self):
        """Test de validation avec données invalides"""
        # Test avec données manquantes pour EmployeeCreate
        with pytest.raises(ValueError):
            EmployeeCreate(name="Test User")  # role manquant
            
        # Test avec type invalide
        with pytest.raises(ValueError):
            EmployeeCreate(name=123, role="Test Role")  # name devrait être string


if __name__ == "__main__":
    pytest.main([__file__, "-v"])