from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import psycopg2
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware to allow React frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "employeesdb")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

def get_connection():
    return psycopg2.connect(
        host=DB_HOST,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def create_tables():
    """Create the employees table if it doesn't exist"""
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Create employees table
        create_table_query = """
        CREATE TABLE IF NOT EXISTS employees (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        cur.execute(create_table_query)
        conn.commit()
        logger.info("Database tables created successfully")
        
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    try:
        create_tables()
        logger.info("Application startup completed successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

class Employee(BaseModel):
    id: Optional[int] = None
    name: str
    role: str

class EmployeeCreate(BaseModel):
    name: str
    role: str

class EmployeeUpdate(BaseModel):
    name: str
    role: str

@app.get("/", response_model=str)
def root():
    return "Bonjour"

@app.get("/employees", response_model=List[Employee])
def get_employees():    
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, name, role FROM employees ORDER BY id;")
        rows = cur.fetchall()
        return [{"id": r[0], "name": r[1], "role": r[2]} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.post("/employees", response_model=Employee)
def add_employee(emp: EmployeeCreate):
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        # Use RETURNING to get the auto-generated ID
        cur.execute(
            "INSERT INTO employees (name, role) VALUES (%s, %s) RETURNING id;",
            (emp.name, emp.role)
        )
        employee_id = cur.fetchone()[0]
        conn.commit()
        return {"id": employee_id, "name": emp.name, "role": emp.role}
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.put("/employees/{employee_id}", response_model=Employee)
def update_employee(employee_id: int, emp: EmployeeUpdate):
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # First check if employee exists
        cur.execute("SELECT id FROM employees WHERE id = %s;", (employee_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Update the employee
        cur.execute(
            "UPDATE employees SET name = %s, role = %s WHERE id = %s;",
            (emp.name, emp.role, employee_id)
        )
        conn.commit()
        
        return {"id": employee_id, "name": emp.name, "role": emp.role}
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.delete("/employees/{employee_id}")
def delete_employee(employee_id: int):
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # First check if employee exists
        cur.execute("SELECT id FROM employees WHERE id = %s;", (employee_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Delete the employee
        cur.execute("DELETE FROM employees WHERE id = %s;", (employee_id,))
        conn.commit()
        
        return {"message": "Employee deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.get("/employees/{employee_id}", response_model=Employee)
def get_employee(employee_id: int):
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, name, role FROM employees WHERE id = %s;", (employee_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Employee not found")
        return {"id": row[0], "name": row[1], "role": row[2]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)