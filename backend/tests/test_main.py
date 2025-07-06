import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import HTTPException
import psycopg2

# Import de l'application
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'app'))
from main import app, get_connection, Employee


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
        mock_cursor.execute.assert_called_once_with("SELECT id, name, role FROM employees;")
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
    def test_get_employees_cursor_error(self, mock_get_connection):
        """Test d'erreur au niveau du curseur"""
        # Mock de la connexion
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Le curseur lève une exception lors de l'exécution
        mock_cursor.execute.side_effect = psycopg2.Error("Erreur SQL")
        
        # Appel de l'endpoint
        response = self.client.get("/employees")
        
        # Vérifications
        assert response.status_code == 500
        assert "Erreur SQL" in response.json()["detail"]
        
    @patch('main.get_connection')
    def test_add_employee_success(self, mock_get_connection):
        """Test d'ajout d'employé avec succès"""
        # Mock de la connexion et du curseur
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_get_connection.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Données de l'employé à ajouter
        employee_data = {
            "id": 4,
            "name": "David Leroy",
            "role": "Testeur"
        }
        
        # Appel de l'endpoint
        response = self.client.post("/employees", json=employee_data)
        
        # Vérifications
        assert response.status_code == 200
        returned_employee = response.json()
        assert returned_employee == employee_data
        
        # Vérification que les méthodes ont été appelées
        mock_get_connection.assert_called_once()
        mock_conn.cursor.assert_called_once()
        mock_cursor.execute.assert_called_once_with(
            "INSERT INTO employees (id, name, role) VALUES (%s, %s, %s);",
            (4, "David Leroy", "Testeur")
        )
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
            "id": 5,
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
            "id": 1,  # ID déjà existant
            "name": "Test User",
            "role": "Test Role"
        }
        
        # Appel de l'endpoint
        response = self.client.post("/employees", json=employee_data)
        
        # Vérifications
        assert response.status_code == 500
        assert "Violation de contrainte" in response.json()["detail"]
        
    def test_add_employee_invalid_data(self):
        """Test d'ajout d'employé avec données invalides"""
        # Données invalides (champ manquant)
        invalid_data = {
            "id": 6,
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
            "id": "not_an_int",  # Devrait être un entier
            "name": "Test User",
            "role": "Test Role"
        }
        
        # Appel de l'endpoint
        response = self.client.post("/employees", json=invalid_data)
        
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
            "id": 7,
            "name": "Test User",
            "role": "Test Role"
        }
        
        # Appel de l'endpoint
        response = self.client.post("/employees", json=employee_data)
        
        # Vérifications que les ressources sont nettoyées même en cas d'erreur
        assert response.status_code == 500
        mock_cursor.close.assert_called_once()
        mock_conn.close.assert_called_once()


class TestEmployeeModel:
    """Tests pour le modèle Employee"""
    
    def test_employee_model_creation(self):
        """Test de création d'un objet Employee"""
        employee = Employee(id=1, name="Test User", role="Test Role")
        
        assert employee.id == 1
        assert employee.name == "Test User"
        assert employee.role == "Test Role"
        
    def test_employee_model_validation(self):
        """Test de validation du modèle Employee"""
        # Test avec données valides
        valid_data = {"id": 1, "name": "Test User", "role": "Test Role"}
        employee = Employee(**valid_data)
        
        assert employee.id == 1
        assert employee.name == "Test User"
        assert employee.role == "Test Role"
        
    def test_employee_model_invalid_data(self):
        """Test de validation avec données invalides"""
        # Test avec données manquantes
        with pytest.raises(ValueError):
            Employee(id=1, name="Test User")  # role manquant
            
        # Test avec type invalide
        with pytest.raises(ValueError):
            Employee(id="not_an_int", name="Test User", role="Test Role")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])