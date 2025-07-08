# Azure Deployment with GitHub Actions Documentation

## Overview

Made by Quentin Lemaire, Maxime Pages et Louis de Choulot.

This documentation describes how to deploy applications using GitHub Actions with a dual-pipeline setup (staging and production) that integrates with Microsoft Azure services.

## Draw.IO Diagram URL
[Draw.IO Diagram](https://drive.google.com/file/d/1S_FP3QF325boTeQ42yycjiizl4A46Be1/view?usp=sharing)

## Pipeline Architecture

### Two-Pipeline Strategy

#### Production Pipeline (Manual Trigger)
- **Trigger**: Manual execution on `main` branch
- **Steps**:
  1. Build and push Docker images
  2. Deploy to production environment

#### Staging Pipeline (Automatic Trigger)
- **Trigger**: Automatic on Pull Request to `main` branch
- **Steps**:
  1. Run automated tests
  2. Run security scans
  3. Build and push Docker images
  4. Deploy to staging environment

## GitHub Secrets Configuration

### Required Secrets Path
Navigate to: **GitHub Repository → Settings → Secrets and Variables → Actions**

### Secret Variables Required

| Secret Name | Description | Source |
|-------------|-------------|--------|
| `AZURE_CLIENT_ID` | Azure Application (Client) ID | Azure Active Directory → App registrations |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription ID | Azure Portal → Subscriptions |
| `AZURE_TENANT_ID` | Azure Tenant ID | Azure Active Directory → Properties |
| `BACKEND_APP_NAME` | Backend application service name | Azure App Service name |
| `FRONTEND_APP_NAME` | Frontend application service name | Azure App Service name |
| `REGISTRY_NAME` | Container Registry name | Azure Container Registry |
| `RESOURCE_GROUP_NAME` | Resource Group containing all resources | Azure Resource Groups |

## Azure Resources Configuration

### Resource Group Structure
**Path**: Azure Portal → Resource Groups → [Your Resource Group]

All resources should be contained within a single Resource Group:

#### 1. Key Vault (Optional)
**Path**: Resource Group → Add → Security → Key Vault
- **Purpose**: Store sensitive configuration values
- **Alternative**: Use GitHub Secrets directly

#### 2. Container Registry
**Path**: Resource Group → Add → Containers → Container Registry
- **Purpose**: Store Docker images for deployment
- **Required for**: Image storage and distribution

#### 3. App Service Plan
**Path**: Resource Group → Add → Web → App Service Plan
- **Purpose**: Define compute resources for App Services
- **Shared by**: Both frontend and backend App Services

#### 4. App Services
**Path**: Resource Group → Add → Web → App Service

##### Backend App Service
- **Configuration**: Container-based deployment
- **Deployment Slots**: 
  - **Staging Slot**: For staging deployments
  - **Production Slot**: For production deployments
- **Path to Slots**: App Service → Deployment → Deployment slots

##### Frontend App Service
- **Configuration**: Container-based deployment
- **Deployment Slots**:
  - **Staging Slot**: For staging deployments
  - **Production Slot**: For production deployments

#### 5. Managed Identity
**Path**: Resource Group → Add → Security → Managed Identity
- **Purpose**: Secure authentication to Azure services
- **Required for**: GitHub Actions authentication

#### 6. Azure Database for PostgreSQL Flexible Server
**Path**: Resource Group → Add → Databases → Azure Database for PostgreSQL flexible server
- **Purpose**: Database backend for application
- **Configuration**: Separate databases for staging and production

## Environment Variables Configuration

### Backend Environment Variables
Configure in: **App Service → Configuration → Application settings**

| Variable Name | Description | Value Source |
|---------------|-------------|--------------|
| `DB_HOST` | Database server URL | PostgreSQL server endpoint |
| `DB_NAME` | Database name | Different for staging/production |
| `DB_PASSWORD` | Database password | PostgreSQL server credentials |
| `DOCKER_REGISTRY_SERVER_PASSWORD` | Container registry password | Container Registry → Access keys |
| `DOCKER_REGISTRY_SERVER_URL` | Container registry URL | Container Registry → Overview |
| `DOCKER_REGISTRY_SERVER_USERNAME` | Container registry username | Container Registry → Access keys |
| `PORT` | Application port | Application-specific (e.g., 8000) OPTIONAL |
| `WEBSITES_ENABLE_APP_SERVICE_STORAGE` | App Service storage | `false` |

### Frontend Environment Variables
Configure in: **App Service → Configuration → Application settings**

| Variable Name | Description | Value Source |
|---------------|-------------|--------------|
| `DOCKER_REGISTRY_SERVER_PASSWORD` | Container registry password | Container Registry → Access keys |
| `DOCKER_REGISTRY_SERVER_URL` | Container registry URL | Container Registry → Overview |
| `DOCKER_REGISTRY_SERVER_USERNAME` | Container registry username | Container Registry → Access keys |
| `REACT_APP_API_URL` | Backend API URL | Backend App Service URL OPTIONAL |
| `WEBSITES_ENABLE_APP_SERVICE_STORAGE` | App Service storage | `false` |

## Azure Authentication Setup

### Federated Identity Configuration
**Path**: Managed Identity → Settings → Federated credentials

1. **Create Federated Identity**:
   - **Scenario**: GitHub Actions deploying Azure resources
   - **Organization**: Your GitHub username/organization
   - **Repository**: Your repository name
   - **Entity type**: Branch (for main branch) or Pull Request

2. **Assign Roles**:
   - **Path**: Azure Subscription → Access control (IAM)
   - **Role**: Contributor (or custom role with necessary permissions)
   - **Scope**: Subscription or Resource Group level

## Project Structure Requirements

### Directory Structure
```
project-root/
├── .github/
│   └── workflows/
│       ├── main.yml          # Production pipeline
│       └── staging.yml       # Staging pipeline
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   └── __init__.py
│   ├── tests/
│   │   ├── test_main.py
│   │   └── __init__.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── package-lock.json
└── .gitignore
```

### Dockerfile Requirements
- **Backend**: Must expose the port defined in `PORT` environment variable
- **Frontend**: Must serve the application on port 80 or configured port
- **Both**: Must be optimized for production deployment

### GitHub Workflow Files
- **main.yml**: Production deployment workflow
- **staging.yml**: Staging deployment workflow with testing

## Azure CLI Commands for Setup

### Get Subscription ID
```bash
az account show --query id -o tsv
```

### Get Tenant ID
```bash
az account show --query tenantId -o tsv
```

### Create Resource Group
```bash
az group create --name <resource-group-name> --location <location>
```

### Create Container Registry
```bash
az acr create --resource-group <resource-group-name> --name <registry-name> --sku Basic
```

## Security Considerations

1. **Secret Management**: Store sensitive values in GitHub Secrets or Azure Key Vault
2. **Network Security**: Configure network access rules for database and services
3. **Authentication**: Use Managed Identity for secure service-to-service authentication
4. **RBAC**: Implement least-privilege access controls
5. **Environment Separation**: Maintain separate databases and configurations for staging/production

## Deployment Process

### Staging Deployment (Automatic)
1. Developer creates Pull Request to `main` branch
2. GitHub Actions triggers staging pipeline
3. Tests and security scans execute
4. On success, images are built and pushed to Container Registry
5. Application deploys to staging slots

### Production Deployment (Manual)
1. Administrator manually triggers production pipeline
2. Images are built and pushed to Container Registry
3. Application deploys to production slots
4. Optional: Swap staging and production slots for zero-downtime deployment

## Troubleshooting

### Common Issues
- **Authentication failures**: Verify Managed Identity and federated credentials
- **Database connectivity**: Check network security groups and firewall rules
- **Container deployment**: Verify registry credentials and image availability
- **Environment variables**: Ensure all required variables are configured

### Monitoring
- **Application Insights**: Monitor application performance and errors
- **Log Analytics**: Centralized logging for troubleshooting
- **Health Checks**: Implement health endpoints for monitoring

---

## Definitions

### App Service
Azure's fully managed web application hosting service that supports multiple programming languages and frameworks.

### App Service Plan
The underlying compute resources that power App Services, defining the region, number of VM instances, and size of VM instances.

### App Service Slot
A deployment feature that allows you to deploy different versions of your application to different slots (staging, production) within the same App Service.

### Azure Active Directory (AAD)
Microsoft's cloud-based identity and access management service.

### Azure CLI
Command-line interface for managing Azure resources.

### Azure Container Registry (ACR)
A managed Docker registry service for storing and managing container images.

### Azure Database for PostgreSQL Flexible Server
A fully managed PostgreSQL database service in Azure with flexible configuration options.

### Azure Key Vault
A cloud service for securely storing and accessing secrets, keys, and certificates.

### CI/CD
Continuous Integration and Continuous Deployment - automated processes for building, testing, and deploying applications.

### Docker
A platform for developing, shipping, and running applications using containerization.

### Dockerfile
A text file containing instructions for building a Docker image.

### Federated Identity
A security feature that allows external identity providers (like GitHub) to authenticate with Azure services without storing credentials.

### GitHub Actions
GitHub's built-in CI/CD platform for automating software workflows.

### GitHub Secrets
Encrypted environment variables stored in GitHub repositories for secure access to sensitive information.

### Managed Identity
An Azure feature that provides an automatically managed identity for applications to use when connecting to Azure services.

### Pull Request (PR)
A method of submitting contributions to a project, allowing code review before merging changes.

### RBAC (Role-Based Access Control)
A security approach that restricts access to resources based on user roles and permissions.

### Resource Group
A logical container that holds related Azure resources for easier management and organization.

### Staging Environment
A pre-production environment used for testing applications before deploying to production.

### Subscription
An Azure billing boundary that contains resource groups and resources.

### Tenant
The top-level Azure Active Directory container that represents an organization.

### YAML
A human-readable data serialization standard commonly used for configuration files.