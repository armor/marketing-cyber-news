# ACI Backend Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the ACI (Anthropic Cyber Intelligence) backend application with PostgreSQL and Redis dependencies.

## Prerequisites

### 1. Kubernetes Cluster

You need a running Kubernetes cluster. Choose one of the following options:

#### Option A: Docker Desktop Kubernetes (Recommended for Mac)
```bash
# 1. Open Docker Desktop
# 2. Go to Settings > Kubernetes
# 3. Check "Enable Kubernetes"
# 4. Click "Apply & Restart"

# Verify cluster is running
kubectl cluster-info
```

#### Option B: Minikube
```bash
# Start minikube cluster
minikube start --cpus=4 --memory=8192

# Verify cluster is running
kubectl cluster-info
```

#### Option C: Kind (Kubernetes in Docker)
```bash
# Create cluster
kind create cluster --name aci-backend

# Verify cluster is running
kubectl cluster-info
```

### 2. Required Tools

```bash
# Install kubectl (if not already installed)
brew install kubectl

# Install kustomize (if not already installed)
brew install kustomize

# Verify installations
kubectl version --client
kustomize version
```

## Quick Start

### 1. Start Kubernetes Cluster

```bash
# For Docker Desktop: Enable Kubernetes in Docker Desktop settings
# OR for Minikube:
minikube start --cpus=4 --memory=8192
```

### 2. Deploy All Resources

```bash
# Navigate to k8s directory
cd aci-backend/deployments/k8s

# Preview what will be deployed
kubectl kustomize .

# Apply all manifests
kubectl apply -k .

# Verify namespace was created
kubectl get namespace aci-backend
```

### 3. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n aci-backend

# Expected output:
# NAME                           READY   STATUS    RESTARTS   AGE
# aci-backend-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
# aci-backend-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
# postgres-0                     1/1     Running   0          2m
# redis-xxxxxxxxxx-xxxxx         1/1     Running   0          2m

# Check services
kubectl get svc -n aci-backend

# Check persistent volumes
kubectl get pvc -n aci-backend
```

### 4. Access Services Locally

#### PostgreSQL Access
```bash
# Port-forward PostgreSQL to localhost:5433
kubectl port-forward svc/postgres-external 5433:5432 -n aci-backend

# In another terminal, connect with psql
psql postgresql://aci_user:aci_password_dev_only@localhost:5433/aci

# Or connect with your favorite PostgreSQL client
# Host: localhost
# Port: 5433
# Database: aci
# User: aci_user
# Password: aci_password_dev_only
```

#### Redis Access
```bash
# Port-forward Redis to localhost:6380
kubectl port-forward svc/redis-external 6380:6379 -n aci-backend

# In another terminal, connect with redis-cli
redis-cli -p 6380

# Test connection
PING
# Should respond with PONG
```

#### Backend API Access
```bash
# Port-forward backend API to localhost:8080
kubectl port-forward svc/aci-backend 8080:80 -n aci-backend

# Test health endpoint
curl http://localhost:8080/v1/health
```

## Architecture

### Components

1. **PostgreSQL (StatefulSet)**
   - Image: `pgvector/pgvector:pg16`
   - Internal Service: `postgres.aci-backend.svc.cluster.local:5432`
   - External NodePort: `30543` (for local access)
   - PVC: `postgres-data` (10Gi)
   - Credentials: `aci_user` / `aci_password_dev_only`

2. **Redis (Deployment)**
   - Image: `redis:7-alpine`
   - Internal Service: `redis.aci-backend.svc.cluster.local:6379`
   - External NodePort: `30638` (for local access)
   - PVC: `redis-data` (1Gi)
   - Configuration: 256MB max memory, LRU eviction policy

3. **ACI Backend (Deployment)**
   - Image: `aci-backend:latest`
   - Replicas: 2 (for HA)
   - Service: `aci-backend.aci-backend.svc.cluster.local:80`
   - Health checks: `/v1/health` (liveness), `/v1/ready` (readiness)

### Resource Files

```
k8s/
├── namespace.yaml          # aci-backend namespace
├── postgres.yaml           # PostgreSQL StatefulSet, Service, PVC, ConfigMap
├── redis.yaml             # Redis Deployment, Service, PVC
├── configmap.yaml         # Application configuration
├── secret.yaml            # Sensitive credentials (JWT, API keys, etc.)
├── deployment.yaml        # Backend application deployment
├── service.yaml           # Backend service
├── ingress.yaml           # Ingress rules (optional)
├── hpa.yaml              # Horizontal Pod Autoscaler
├── pdb.yaml              # Pod Disruption Budget
└── kustomization.yaml    # Kustomize configuration
```

## Configuration

### Environment Variables (ConfigMap)

Key configuration values in `configmap.yaml`:
- `SERVER_PORT`: 8080
- `LOG_LEVEL`: info
- `DATABASE_HOST`: postgres.aci-backend.svc.cluster.local
- `REDIS_HOST`: redis.aci-backend.svc.cluster.local
- Feature flags: CORS, request logging, rate limiting

### Secrets (Secret)

Sensitive values in `secret.yaml` (⚠️ **REPLACE BEFORE PRODUCTION**):
- `DATABASE_PASSWORD`: PostgreSQL password
- `JWT_PRIVATE_KEY`: RSA private key for JWT signing
- `JWT_PUBLIC_KEY`: RSA public key for JWT verification
- `N8N_WEBHOOK_SECRET`: n8n webhook authentication
- `ANTHROPIC_API_KEY`: Claude API key

### Generating Production Secrets

```bash
# Generate JWT key pair
ssh-keygen -t rsa -b 4096 -m PEM -f jwt-private.pem -N ""
ssh-keygen -f jwt-private.pem -e -m PKCS8 > jwt-public.pem

# Generate webhook secret
openssl rand -base64 32

# Generate database password
openssl rand -base64 24

# Update secret.yaml with generated values
```

## Database Initialization

PostgreSQL is initialized with:
1. `pgvector` extension (for vector embeddings)
2. Database: `aci`
3. User: `aci_user` with full privileges

Custom initialization scripts can be added to the `postgres-init` ConfigMap in `postgres.yaml`.

## Common Operations

### View Logs

```bash
# Backend logs
kubectl logs -f deployment/aci-backend -n aci-backend

# PostgreSQL logs
kubectl logs -f statefulset/postgres -n aci-backend

# Redis logs
kubectl logs -f deployment/redis -n aci-backend

# All logs from the namespace
kubectl logs -f -n aci-backend --all-containers=true
```

### Restart Services

```bash
# Restart backend
kubectl rollout restart deployment/aci-backend -n aci-backend

# Restart Redis
kubectl rollout restart deployment/redis -n aci-backend

# Restart PostgreSQL (⚠️ causes brief downtime)
kubectl rollout restart statefulset/postgres -n aci-backend
```

### Scale Backend

```bash
# Scale to 3 replicas
kubectl scale deployment/aci-backend --replicas=3 -n aci-backend

# Verify scaling
kubectl get pods -n aci-backend -l app.kubernetes.io/name=aci-backend
```

### Update Configuration

```bash
# Edit ConfigMap
kubectl edit configmap aci-backend-config -n aci-backend

# Restart pods to pick up changes
kubectl rollout restart deployment/aci-backend -n aci-backend
```

### Access Pod Shell

```bash
# Backend pod
kubectl exec -it deployment/aci-backend -n aci-backend -- sh

# PostgreSQL pod
kubectl exec -it statefulset/postgres -n aci-backend -- bash

# Redis pod
kubectl exec -it deployment/redis -n aci-backend -- sh
```

### Database Backup

```bash
# Create backup
kubectl exec -it statefulset/postgres -n aci-backend -- \
  pg_dump -U aci_user -d aci > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
kubectl exec -i statefulset/postgres -n aci-backend -- \
  psql -U aci_user -d aci < backup_20231215_120000.sql
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n aci-backend

# Describe pod for events
kubectl describe pod <pod-name> -n aci-backend

# Check pod logs
kubectl logs <pod-name> -n aci-backend

# Check previous logs (if pod crashed)
kubectl logs <pod-name> -n aci-backend --previous
```

### Database Connection Issues

```bash
# Test database connectivity from backend pod
kubectl exec -it deployment/aci-backend -n aci-backend -- \
  sh -c 'nc -zv postgres.aci-backend.svc.cluster.local 5432'

# Check PostgreSQL logs
kubectl logs -f statefulset/postgres -n aci-backend

# Verify database credentials
kubectl get secret postgres-credentials -n aci-backend -o yaml
```

### Service Discovery Issues

```bash
# Test DNS resolution from backend pod
kubectl exec -it deployment/aci-backend -n aci-backend -- \
  nslookup postgres.aci-backend.svc.cluster.local

# Check service endpoints
kubectl get endpoints -n aci-backend
```

### Storage Issues

```bash
# Check PVC status
kubectl get pvc -n aci-backend

# Describe PVC for events
kubectl describe pvc postgres-data -n aci-backend

# Check available storage classes
kubectl get storageclass
```

## Cleanup

### Delete All Resources

```bash
# Delete everything in the namespace
kubectl delete -k .

# OR delete the entire namespace (⚠️ deletes all data)
kubectl delete namespace aci-backend
```

### Delete Specific Resources

```bash
# Delete only the backend deployment
kubectl delete deployment aci-backend -n aci-backend

# Delete only PostgreSQL (⚠️ data persists in PVC)
kubectl delete statefulset postgres -n aci-backend

# Delete PVCs (⚠️ deletes all data)
kubectl delete pvc --all -n aci-backend
```

## Production Considerations

### Security

1. **Replace all placeholder secrets** in `secret.yaml`
2. **Use external secret management** (HashiCorp Vault, AWS Secrets Manager, etc.)
3. **Enable TLS/SSL** for all external connections
4. **Configure network policies** to restrict pod-to-pod communication
5. **Enable RBAC** and limit service account permissions
6. **Scan images** for vulnerabilities regularly

### High Availability

1. **Use managed database** (AWS RDS, Google Cloud SQL, etc.) instead of in-cluster PostgreSQL
2. **Use managed Redis** (AWS ElastiCache, Google Memorystore, etc.)
3. **Increase backend replicas** (at least 3 in production)
4. **Configure pod anti-affinity** to spread replicas across nodes
5. **Set up horizontal pod autoscaling** (HPA is already configured)
6. **Configure pod disruption budgets** (PDB is already configured)

### Monitoring

1. **Set up Prometheus** for metrics collection
2. **Configure Grafana** dashboards
3. **Enable application metrics** (backend exposes Prometheus metrics)
4. **Set up alerting** for critical conditions
5. **Configure log aggregation** (ELK, Loki, etc.)

### Backup & Disaster Recovery

1. **Automate database backups** (CronJob or managed service backups)
2. **Test restore procedures** regularly
3. **Back up Kubernetes resources** (Velero or similar)
4. **Document recovery procedures**
5. **Set up cross-region replication** for critical data

## Development Workflow

### Local Development with Kubernetes

```bash
# 1. Build backend image locally
cd aci-backend
docker build -t aci-backend:dev -f deployments/Dockerfile .

# 2. Load image into cluster (if using minikube or kind)
# For minikube:
minikube image load aci-backend:dev
# For kind:
kind load docker-image aci-backend:dev --name aci-backend

# 3. Update kustomization.yaml to use dev tag
# Change: newTag: latest -> newTag: dev

# 4. Deploy
kubectl apply -k deployments/k8s/

# 5. Port-forward for local testing
kubectl port-forward svc/aci-backend 8080:80 -n aci-backend
kubectl port-forward svc/postgres-external 5433:5432 -n aci-backend
```

### Hot Reload (Skaffold)

For rapid development, consider using Skaffold:

```bash
# Install Skaffold
brew install skaffold

# Create skaffold.yaml (example in project root)
# Run with hot reload
skaffold dev
```

## Support

For issues or questions:
1. Check pod logs: `kubectl logs -f <pod-name> -n aci-backend`
2. Check pod events: `kubectl describe pod <pod-name> -n aci-backend`
3. Review this README for common operations
4. Consult Kubernetes documentation: https://kubernetes.io/docs/
