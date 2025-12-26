# AI Newsletter Automation - Kubernetes Deployment

Complete Kubernetes deployment for the AI Newsletter Automation system in the `armor-newsletter` namespace.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NAMESPACE: armor-newsletter                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐             │
│  │  PostgreSQL  │   │    Redis     │   │   Mailpit    │             │
│  │  (pgvector)  │   │   (cache)    │   │  (mock SMTP) │             │
│  │   :5432      │   │   :6379      │   │   :25/:8025  │             │
│  └──────────────┘   └──────────────┘   └──────────────┘             │
│         │                 │                   │                      │
│         └─────────┬───────┴───────────────────┘                      │
│                   │                                                  │
│  ┌────────────────▼────────────────┐   ┌──────────────────────────┐ │
│  │         aci-backend             │   │          n8n              │ │
│  │       (Go API server)           │   │    (workflow engine)      │ │
│  │          :8080                  │◄──►│        :5678              │ │
│  └──────────────┬──────────────────┘   └──────────────────────────┘ │
│                 │                                                    │
│  ┌──────────────▼──────────────────┐                                │
│  │        aci-frontend             │                                │
│  │     (React/Vite + nginx)        │                                │
│  │          :80                    │                                │
│  └─────────────────────────────────┘                                │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                         INGRESS (nginx)                              │
│   newsletter.local/      → aci-frontend                              │
│   newsletter.local/api   → aci-backend                               │
│   newsletter.local/n8n   → n8n                                       │
│   newsletter.local/mail  → mailpit                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Components

| Component | Image | Port | NodePort | Description |
|-----------|-------|------|----------|-------------|
| PostgreSQL | pgvector/pgvector:pg16 | 5432 | 30432 | Database with vector support |
| Redis | redis:7-alpine | 6379 | - | Caching and sessions |
| Mailpit | axllent/mailpit:latest | 25, 8025 | 30825 | Mock SMTP + Web UI |
| n8n | n8nio/n8n:latest | 5678 | 30567 | Workflow automation |
| aci-backend | aci-backend:latest | 8080 | 30808 | Go API server |
| aci-frontend | aci-frontend:latest | 80 | 30080 | React frontend |

## Prerequisites

1. **Kubernetes Cluster**
   - minikube, kind, k3s, or any K8s cluster
   - kubectl configured and connected

2. **Docker**
   - For building images

3. **Ingress Controller** (optional)
   - For minikube: `minikube addons enable ingress`
   - For others: nginx-ingress or traefik

## Quick Start

### Option 1: Using the Deploy Script (Recommended)

```bash
# Full deployment (build + apply + migrate)
./deployments/deploy.sh deploy

# Or step by step:
./deployments/deploy.sh build     # Build images only
./deployments/deploy.sh apply     # Apply K8s manifests only
./deployments/deploy.sh migrate   # Run migrations only
```

### Option 2: Manual Deployment

```bash
# 1. Start your cluster
minikube start

# 2. Configure Docker for minikube
eval $(minikube docker-env)

# 3. Build images
docker build -t aci-backend:latest -f aci-backend/deployments/Dockerfile aci-backend/
docker build -t aci-frontend:latest -f aci-frontend/Dockerfile aci-frontend/

# 4. Apply manifests
kubectl apply -k deployments/k8s

# 5. Wait for pods
kubectl get pods -n armor-newsletter -w

# 6. Run migrations (after postgres is ready)
kubectl exec -n armor-newsletter postgres-0 -- psql -U newsletter_user -d armor_newsletter -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

## Accessing Services

### Via NodePort (Direct)

For minikube:
```bash
# Get minikube IP
MINIKUBE_IP=$(minikube ip)

# Access services
open http://$MINIKUBE_IP:30080  # Frontend
open http://$MINIKUBE_IP:30808  # Backend API
open http://$MINIKUBE_IP:30567  # n8n
open http://$MINIKUBE_IP:30825  # Mailpit
```

For other clusters (port-forward):
```bash
kubectl port-forward -n armor-newsletter svc/aci-frontend 3000:80 &
kubectl port-forward -n armor-newsletter svc/aci-backend 8080:80 &
kubectl port-forward -n armor-newsletter svc/n8n 5678:5678 &
kubectl port-forward -n armor-newsletter svc/mailpit 8025:8025 &
```

### Via Ingress

1. Add to `/etc/hosts`:
   ```
   $(minikube ip) newsletter.local
   # OR for other clusters:
   127.0.0.1 newsletter.local
   ```

2. Access:
   - Frontend: http://newsletter.local
   - Backend API: http://newsletter.local/api
   - n8n: http://newsletter.local/n8n
   - Mailpit: http://newsletter.local/mail

## Configuration

### Secrets (deployments/k8s/secrets.yaml)

**IMPORTANT:** Update these for production:

```yaml
DATABASE_PASSWORD: "newsletter_password_dev_only"  # Change this!
JWT_SECRET: "dev-jwt-secret..."                    # Change this!
OPENROUTER_API_KEY: "sk-or-..."                   # Add real key
```

### Environment Variables (deployments/k8s/configmap.yaml)

Key configurations:
- `DATABASE_URL` - PostgreSQL connection
- `SMTP_HOST` - Points to Mailpit for mock email
- `OPENROUTER_MODEL` - AI model for summarization
- `CORS_ALLOWED_ORIGINS` - Allowed frontend origins

## n8n Workflows

Workflows are automatically loaded from ConfigMaps:

| Workflow | Trigger | Description |
|----------|---------|-------------|
| newsletter-content-ingestion | Scheduled (30min) | Fetch content from sources |
| newsletter-generation | Webhook/Manual | Generate newsletter issues |
| newsletter-approval | Webhook | Handle approval flow |
| newsletter-delivery-smtp | Webhook | Send via SMTP (Mailpit) |
| engagement-webhook | Webhook | Track email engagement |

### Manual Workflow Import

If workflows don't auto-import:

1. Access n8n UI: http://$(minikube ip):30567
2. Click Workflows → Import
3. Import JSON files from `n8n-workflows/` directory

### SMTP Credential Setup in n8n

Create SMTP credential for Mailpit:
1. Settings → Credentials → Create New
2. Type: SMTP
3. Host: `mailpit.armor-newsletter.svc.cluster.local`
4. Port: `25`
5. SSL: Disabled
6. User/Password: (leave empty)

## Viewing Sent Emails

Mailpit provides a web UI to view all sent emails:

```bash
# Access Mailpit UI
open http://$(minikube ip):30825
```

Features:
- View all sent newsletters
- Inspect HTML content
- Search by subject/recipient
- Download raw email

## Monitoring & Debugging

### View All Resources
```bash
kubectl get all -n armor-newsletter
```

### View Logs
```bash
# Backend logs
kubectl logs -n armor-newsletter -l app.kubernetes.io/name=aci-backend -f

# n8n logs
kubectl logs -n armor-newsletter -l app.kubernetes.io/name=n8n -f

# All pods
kubectl logs -n armor-newsletter --all-containers=true -f
```

### Describe Resources
```bash
kubectl describe pod -n armor-newsletter -l app.kubernetes.io/name=aci-backend
```

### Shell Access
```bash
# Backend shell
kubectl exec -it -n armor-newsletter deploy/aci-backend -- sh

# PostgreSQL shell
kubectl exec -it -n armor-newsletter postgres-0 -- psql -U newsletter_user -d armor_newsletter
```

## Cleanup

```bash
# Delete all resources
kubectl delete -k deployments/k8s

# OR using deploy script
./deployments/deploy.sh delete
```

## Troubleshooting

### Pods Not Starting

1. Check pod status:
   ```bash
   kubectl describe pod -n armor-newsletter <pod-name>
   ```

2. Common issues:
   - **ImagePullBackOff**: Images not built or not accessible. Run `./deployments/deploy.sh build`
   - **CrashLoopBackOff**: Check logs for application errors
   - **Pending**: Insufficient resources or PVC issues

### Database Connection Failed

1. Verify PostgreSQL is running:
   ```bash
   kubectl get pods -n armor-newsletter -l app.kubernetes.io/name=postgres
   ```

2. Check connection from backend:
   ```bash
   kubectl exec -n armor-newsletter deploy/aci-backend -- nc -zv postgres.armor-newsletter.svc.cluster.local 5432
   ```

### n8n Workflows Not Working

1. Check n8n logs:
   ```bash
   kubectl logs -n armor-newsletter -l app.kubernetes.io/name=n8n -f
   ```

2. Verify credentials are configured in n8n UI
3. Check PostgreSQL connectivity from n8n

### Emails Not Appearing in Mailpit

1. Check Mailpit is running:
   ```bash
   kubectl get pods -n armor-newsletter -l app.kubernetes.io/name=mailpit
   ```

2. Verify SMTP connection:
   ```bash
   kubectl exec -n armor-newsletter deploy/aci-backend -- nc -zv mailpit.armor-newsletter.svc.cluster.local 25
   ```

## Production Considerations

For production deployment:

1. **Secrets Management**
   - Use Kubernetes Secrets or external secret manager (Vault, AWS Secrets Manager)
   - Never commit real secrets to git

2. **Persistent Storage**
   - Configure StorageClass for your cloud provider
   - Enable backup for PostgreSQL PVC

3. **TLS/HTTPS**
   - Install cert-manager for automatic certificates
   - Configure TLS in Ingress

4. **Resource Limits**
   - Adjust CPU/memory limits based on load
   - Enable HPA for auto-scaling

5. **Monitoring**
   - Add Prometheus/Grafana for metrics
   - Configure alerting

6. **Replace Mailpit**
   - Use real ESP (HubSpot, SendGrid, Mailchimp)
   - Update SMTP credentials and workflow
