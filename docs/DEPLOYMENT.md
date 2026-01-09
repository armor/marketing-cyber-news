# Deployment Guide

> Complete guide for deploying Armor Newsletter to Kubernetes (OKE)

---

## Prerequisites

### Tools Required
- Docker with buildx support
- kubectl configured for your cluster
- Access to container registry (OCIR, ttl.sh, or Docker Hub)
- PostgreSQL client (psql)

### Cluster Requirements
- Kubernetes 1.28+
- Storage class for PersistentVolumeClaims
- LoadBalancer support (or Ingress controller)
- Minimum 4GB RAM, 2 CPU per node

---

## Quick Start

```bash
# 1. Build and push images
./scripts/build-and-push.sh

# 2. Deploy to Kubernetes
kubectl apply -k deployments/k8s/overlays/production

# 3. Run migrations
kubectl exec -it -n armor-newsletter deploy/postgres -- psql -U postgres -d armor_newsletter -f /migrations/all.sql

# 4. Seed test data
kubectl exec -it -n armor-newsletter deploy/postgres -- psql -U postgres -d armor_newsletter -f /scripts/seed-test-data.sql

# 5. Access the application
kubectl port-forward -n armor-newsletter svc/aci-frontend 3000:80
```

---

## Detailed Deployment Steps

### Step 1: Build Docker Images

The application requires two images: backend and frontend.

```bash
# Backend
cd aci-backend
docker buildx build \
  --platform linux/amd64 \
  -t <registry>/aci-backend:latest \
  --push \
  -f deployments/Dockerfile \
  .

# Frontend (with correct API URL)
cd ../aci-frontend
docker buildx build \
  --platform linux/amd64 \
  --build-arg VITE_API_URL=http://localhost:3000/api/v1 \
  -t <registry>/aci-frontend:latest \
  --push \
  -f Dockerfile \
  .
```

**Important:** The `VITE_API_URL` must be the browser-accessible URL, not an internal Kubernetes hostname.

### Step 2: Configure Secrets

Create Kubernetes secrets for sensitive data:

```bash
# Create namespace
kubectl create namespace armor-newsletter

# Database credentials
kubectl create secret generic db-credentials \
  -n armor-newsletter \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=your-secure-password \
  --from-literal=POSTGRES_DB=armor_newsletter

# JWT keys (generate RS256 keypair)
openssl genrsa -out jwt-private.pem 2048
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem

kubectl create secret generic jwt-keys \
  -n armor-newsletter \
  --from-file=private=jwt-private.pem \
  --from-file=public=jwt-public.pem

# API keys
kubectl create secret generic api-keys \
  -n armor-newsletter \
  --from-literal=OPENROUTER_API_KEY=your-openrouter-key
```

### Step 3: Apply Kubernetes Manifests

```bash
# Using Kustomize (recommended)
kubectl apply -k deployments/k8s/overlays/production

# Or apply individual files
kubectl apply -f deployments/k8s/base/namespace.yaml
kubectl apply -f deployments/k8s/base/configmap.yaml
kubectl apply -f deployments/k8s/base/postgres.yaml
kubectl apply -f deployments/k8s/base/redis.yaml
kubectl apply -f deployments/k8s/base/backend.yaml
kubectl apply -f deployments/k8s/base/frontend.yaml
kubectl apply -f deployments/k8s/base/n8n.yaml
```

### Step 4: Run Database Migrations

```bash
# Get postgres pod name
POSTGRES_POD=$(kubectl get pods -n armor-newsletter -l app=postgres -o jsonpath='{.items[0].metadata.name}')

# Copy migrations
kubectl cp aci-backend/migrations $POSTGRES_POD:/migrations -n armor-newsletter

# Run all migrations
kubectl exec -it $POSTGRES_POD -n armor-newsletter -- psql -U postgres -d armor_newsletter -c "
  \i /migrations/000001_initial_schema.up.sql
  \i /migrations/000002_content_management.up.sql
  \i /migrations/000003_alert_system.up.sql
  \i /migrations/000004_engagement_tracking.up.sql
  \i /migrations/000005_audit_trail.up.sql
  \i /migrations/000006_threat_intelligence.up.sql
  \i /migrations/000007_approval_workflow.up.sql
  \i /migrations/000008_newsletter_system.up.sql
  \i /migrations/000009_enhanced_auth.up.sql
"
```

### Step 5: Seed Test Data (Optional)

```bash
kubectl cp aci-backend/scripts/seed-test-data.sql $POSTGRES_POD:/tmp/ -n armor-newsletter
kubectl exec -it $POSTGRES_POD -n armor-newsletter -- psql -U postgres -d armor_newsletter -f /tmp/seed-test-data.sql
```

### Step 6: Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n armor-newsletter

# Check services
kubectl get svc -n armor-newsletter

# Check logs
kubectl logs -n armor-newsletter deploy/aci-backend --tail=50
kubectl logs -n armor-newsletter deploy/aci-frontend --tail=50
```

---

## Access Methods

### Port Forwarding (Development)

```bash
# Frontend
kubectl port-forward -n armor-newsletter svc/aci-frontend 3000:80 &

# Backend (direct access)
kubectl port-forward -n armor-newsletter svc/aci-backend 8080:80 &

# Access at http://localhost:3000
```

### LoadBalancer (Production)

```bash
# Get external IP
kubectl get svc -n armor-newsletter aci-frontend-lb -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

### Ingress (Production with custom domain)

```yaml
# Apply ingress with your domain
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: armor-newsletter
  namespace: armor-newsletter
spec:
  rules:
  - host: newsletter.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: aci-frontend
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: aci-backend
            port:
              number: 80
```

---

## Environment Configuration

### Backend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_PRIVATE_KEY` | RS256 private key | Yes |
| `JWT_PUBLIC_KEY` | RS256 public key | Yes |
| `SERVER_PORT` | API server port (default: 8080) | No |
| `OPENROUTER_API_KEY` | AI model API key | Yes |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins | Yes |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | No |

### Frontend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL (browser-accessible) | Yes |

---

## Scaling

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aci-backend-hpa
  namespace: armor-newsletter
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: aci-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Manual Scaling

```bash
kubectl scale deployment aci-backend -n armor-newsletter --replicas=3
kubectl scale deployment aci-frontend -n armor-newsletter --replicas=2
```

---

## Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:8080/health

# Backend readiness
curl http://localhost:8080/ready

# Prometheus metrics
curl http://localhost:8080/metrics
```

### Logs

```bash
# Stream backend logs
kubectl logs -f -n armor-newsletter deploy/aci-backend

# Stream frontend logs
kubectl logs -f -n armor-newsletter deploy/aci-frontend

# All pods
kubectl logs -n armor-newsletter -l app=aci-backend --tail=100
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "exec format error" | Wrong architecture | Rebuild with `--platform linux/amd64` |
| "Invalid URL" on frontend | Relative VITE_API_URL | Use full URL: `http://localhost:3000/api/v1` |
| "Failed to fetch" | CORS or network | Check CORS_ALLOWED_ORIGINS |
| DB connection refused | Wrong hostname | Use K8s service name: `postgres.armor-newsletter.svc.cluster.local` |
| Login fails | Wrong password hash | Re-run seed data with bcrypt hash |

### Debug Commands

```bash
# Describe failing pod
kubectl describe pod <pod-name> -n armor-newsletter

# Get events
kubectl get events -n armor-newsletter --sort-by='.lastTimestamp'

# Exec into pod
kubectl exec -it -n armor-newsletter deploy/aci-backend -- /bin/sh

# Check DNS resolution
kubectl run -it --rm debug --image=busybox -n armor-newsletter -- nslookup postgres
```

---

## Rollback

```bash
# View rollout history
kubectl rollout history deployment/aci-backend -n armor-newsletter

# Rollback to previous version
kubectl rollout undo deployment/aci-backend -n armor-newsletter

# Rollback to specific revision
kubectl rollout undo deployment/aci-backend -n armor-newsletter --to-revision=2
```

---

## Cleanup

```bash
# Delete all resources
kubectl delete -k deployments/k8s/overlays/production

# Or delete namespace (removes everything)
kubectl delete namespace armor-newsletter
```

---

*For CI/CD pipeline details, see `.github/workflows/deploy-oci.yml`*
