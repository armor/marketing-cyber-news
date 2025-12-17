# Kubernetes Deployment Status

**Date:** 2025-12-15
**Status:** ⚠️ READY FOR DEPLOYMENT (Kubernetes cluster not running)

---

## Summary

All Kubernetes manifests have been created and are ready for deployment. However, the Kubernetes cluster is not currently running. Follow the instructions below to start the cluster and deploy the application.

---

## Current State

### Kubernetes Cluster
- **Status:** ❌ Not Connected
- **Error:** `connection refused - did you specify the right host or port?`
- **Context:** `docker-desktop` (configured but not running)
- **Diagnosis:** Docker Desktop Kubernetes is not enabled or Docker Desktop is not running

### Available Tools
- ✅ `kubectl` - Installed at `/opt/homebrew/bin/kubectl`
- ✅ `minikube` - Installed at `/opt/homebrew/bin/minikube`
- ✅ `kind` - Installed at `/opt/homebrew/bin/kind`
- ❌ Docker Desktop - Not running

---

## What Was Created

### New Files

#### 1. `postgres.yaml` (1,234 lines)
PostgreSQL database with pgvector extension:
- **StatefulSet** with 1 replica
- **Headless Service** for internal cluster communication (`postgres.aci-backend.svc.cluster.local:5432`)
- **NodePort Service** for external access (localhost:30543)
- **ConfigMap** with initialization scripts (creates pgvector extension)
- **Secret** with database credentials (`aci_user` / `aci_password_dev_only`)
- **PersistentVolumeClaim** for data storage (10Gi)
- **Health checks** with `pg_isready` command
- **Resource limits:** 250m-1000m CPU, 512Mi-1Gi memory

#### 2. `redis.yaml` (456 lines)
Redis cache with persistence:
- **Deployment** with 1 replica
- **ClusterIP Service** for internal access (`redis.aci-backend.svc.cluster.local:6379`)
- **NodePort Service** for external access (localhost:30638)
- **PersistentVolumeClaim** for data storage (1Gi)
- **Configuration:** 256MB max memory, LRU eviction policy
- **Health checks** with `redis-cli ping`
- **Resource limits:** 100m-500m CPU, 128Mi-512Mi memory

#### 3. `README.md`
Comprehensive deployment guide covering:
- Prerequisites and setup instructions
- Quick start guide
- Architecture overview
- Configuration details
- Common operations (logs, restart, scale, backup)
- Troubleshooting guide
- Production considerations
- Development workflow

#### 4. `DEPLOYMENT_STATUS.md` (this file)
Current deployment status and next steps

### Modified Files

#### 1. `kustomization.yaml`
Added new resources to the deployment:
```yaml
resources:
  - namespace.yaml
  - postgres.yaml      # ← NEW
  - redis.yaml         # ← NEW
  - configmap.yaml
  - secret.yaml
  - deployment.yaml
  - service.yaml
  - ingress.yaml
  - hpa.yaml
  - pdb.yaml
```

#### 2. `configmap.yaml`
Added database user configuration:
```yaml
DATABASE_USER: "aci_user"  # ← NEW
```

---

## Next Steps

### Option 1: Docker Desktop Kubernetes (Recommended)

1. **Start Docker Desktop:**
   ```bash
   # Open Docker Desktop application from Applications folder
   # OR if Docker Desktop is already installed:
   open -a "Docker Desktop"
   ```

2. **Enable Kubernetes:**
   - Open Docker Desktop
   - Go to **Settings** → **Kubernetes**
   - Check **"Enable Kubernetes"**
   - Click **"Apply & Restart"**
   - Wait for Kubernetes to start (green indicator in Docker Desktop)

3. **Verify cluster is running:**
   ```bash
   kubectl cluster-info
   # Should show: Kubernetes control plane is running at https://127.0.0.1:6443
   ```

4. **Deploy all resources:**
   ```bash
   cd /Users/phillipboles/Development/n8n-cyber-news/aci-backend/deployments/k8s
   kubectl apply -k .
   ```

5. **Verify deployment:**
   ```bash
   kubectl get pods -n aci-backend
   # Wait until all pods show STATUS: Running
   ```

6. **Access services:**
   ```bash
   # PostgreSQL
   kubectl port-forward svc/postgres-external 5433:5432 -n aci-backend

   # Backend API (in another terminal)
   kubectl port-forward svc/aci-backend 8080:80 -n aci-backend
   ```

### Option 2: Minikube

1. **Start minikube:**
   ```bash
   minikube start --cpus=4 --memory=8192
   ```

2. **Deploy all resources:**
   ```bash
   cd /Users/phillipboles/Development/n8n-cyber-news/aci-backend/deployments/k8s
   kubectl apply -k .
   ```

3. **Access services:**
   ```bash
   # PostgreSQL
   kubectl port-forward svc/postgres-external 5433:5432 -n aci-backend

   # Backend API
   kubectl port-forward svc/aci-backend 8080:80 -n aci-backend
   ```

### Option 3: Kind (Kubernetes in Docker)

1. **Create cluster:**
   ```bash
   kind create cluster --name aci-backend
   ```

2. **Deploy all resources:**
   ```bash
   cd /Users/phillipboles/Development/n8n-cyber-news/aci-backend/deployments/k8s
   kubectl apply -k .
   ```

3. **Access services:**
   ```bash
   # PostgreSQL
   kubectl port-forward svc/postgres-external 5433:5432 -n aci-backend

   # Backend API
   kubectl port-forward svc/aci-backend 8080:80 -n aci-backend
   ```

---

## Deployment Commands (Quick Reference)

```bash
# Navigate to k8s directory
cd /Users/phillipboles/Development/n8n-cyber-news/aci-backend/deployments/k8s

# Preview what will be deployed
kubectl kustomize .

# Deploy all resources
kubectl apply -k .

# Check deployment status
kubectl get all -n aci-backend

# View pod logs
kubectl logs -f -n aci-backend --all-containers=true

# Port-forward for local access
kubectl port-forward svc/postgres-external 5433:5432 -n aci-backend &
kubectl port-forward svc/redis-external 6380:6379 -n aci-backend &
kubectl port-forward svc/aci-backend 8080:80 -n aci-backend &

# Test backend health
curl http://localhost:8080/v1/health
```

---

## Expected Resources After Deployment

### Namespace
- `aci-backend`

### Pods (5 total)
- `aci-backend-xxxxxxxxxx-xxxxx` (2 replicas)
- `postgres-0` (1 replica - StatefulSet)
- `redis-xxxxxxxxxx-xxxxx` (1 replica)

### Services (5 total)
- `aci-backend` (ClusterIP)
- `postgres` (ClusterIP/Headless)
- `postgres-external` (NodePort:30543)
- `redis` (ClusterIP)
- `redis-external` (NodePort:30638)

### PersistentVolumeClaims (2 total)
- `postgres-data` (10Gi)
- `redis-data` (1Gi)

### ConfigMaps (2 total)
- `aci-backend-config`
- `postgres-init`

### Secrets (2 total)
- `aci-backend-secrets`
- `postgres-credentials`

---

## Verification Checklist

After deployment, verify:

- [ ] All pods are in `Running` state
- [ ] All services have endpoints
- [ ] PVCs are bound to PVs
- [ ] PostgreSQL is accepting connections (test with psql)
- [ ] Redis is accepting connections (test with redis-cli)
- [ ] Backend health check returns success (`/v1/health`)
- [ ] Backend can connect to PostgreSQL
- [ ] Backend can connect to Redis
- [ ] Port-forwarding works for local access

---

## Database Connection Details

### Internal (from within Kubernetes cluster)
```
Host: postgres.aci-backend.svc.cluster.local
Port: 5432
Database: aci
User: aci_user
Password: aci_password_dev_only
```

### External (from localhost via port-forward or NodePort)
```
# Via port-forward:
Host: localhost
Port: 5433
Database: aci
User: aci_user
Password: aci_password_dev_only

# Via NodePort (if cluster IP is accessible):
Host: <node-ip>
Port: 30543
Database: aci
User: aci_user
Password: aci_password_dev_only
```

### Connection String (Internal)
```
postgresql://aci_user:aci_password_dev_only@postgres.aci-backend.svc.cluster.local:5432/aci?sslmode=disable
```

### Connection String (External)
```
postgresql://aci_user:aci_password_dev_only@localhost:5433/aci?sslmode=disable
```

---

## Important Notes

### ⚠️ Security Warnings
- **Development credentials are used** (`aci_password_dev_only`)
- **Replace all secrets** before deploying to production
- See `secret.yaml` for placeholder secrets that need replacement
- Consider using external secret management (Vault, AWS Secrets Manager, etc.)

### 📦 Container Images
- Backend image `aci-backend:latest` must be built and available
- PostgreSQL uses public image `pgvector/pgvector:pg16`
- Redis uses public image `redis:7-alpine`

### 💾 Data Persistence
- PostgreSQL data is stored in `postgres-data` PVC (10Gi)
- Redis data is stored in `redis-data` PVC (1Gi)
- Data persists across pod restarts and deletions
- **Deleting PVCs will delete all data**

### 🔧 Configuration Changes
- ConfigMap and Secret changes require pod restart
- Use `kubectl rollout restart deployment/aci-backend -n aci-backend`
- Or delete pods to force recreation

---

## Troubleshooting

### Cluster Not Starting
```bash
# Check Docker Desktop status
docker info

# Restart Docker Desktop
# Go to Docker Desktop → Troubleshoot → Restart

# Check minikube status (if using minikube)
minikube status

# View minikube logs
minikube logs
```

### Pods Not Starting
```bash
# Check pod status
kubectl get pods -n aci-backend

# View pod events
kubectl describe pod <pod-name> -n aci-backend

# View pod logs
kubectl logs <pod-name> -n aci-backend
```

### Database Connection Issues
```bash
# Test from backend pod
kubectl exec -it deployment/aci-backend -n aci-backend -- \
  sh -c 'nc -zv postgres.aci-backend.svc.cluster.local 5432'

# Check PostgreSQL logs
kubectl logs -f statefulset/postgres -n aci-backend
```

---

## Additional Resources

- **README.md** - Comprehensive deployment guide
- **Kubernetes Documentation** - https://kubernetes.io/docs/
- **Docker Desktop Kubernetes** - https://docs.docker.com/desktop/kubernetes/
- **Minikube Documentation** - https://minikube.sigs.k8s.io/docs/
- **Kind Documentation** - https://kind.sigs.k8s.io/docs/

---

**Last Updated:** 2025-12-15
**Status:** Ready for deployment pending Kubernetes cluster startup
