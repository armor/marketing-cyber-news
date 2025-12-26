#!/bin/bash
# =============================================================================
# AI Newsletter Automation - Kubernetes Deployment Script
# Namespace: armor-newsletter
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="armor-newsletter"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
K8S_DIR="$SCRIPT_DIR/k8s"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi

    # Check docker
    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed. Please install docker first."
        exit 1
    fi

    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please ensure your cluster is running."
        log_info "For minikube: minikube start"
        log_info "For kind: kind create cluster"
        exit 1
    fi

    log_success "All prerequisites met"
}

detect_cluster_type() {
    # Detect cluster type for appropriate image loading
    if kubectl config current-context | grep -q "minikube"; then
        echo "minikube"
    elif kubectl config current-context | grep -q "kind"; then
        echo "kind"
    elif kubectl config current-context | grep -q "docker-desktop"; then
        echo "docker-desktop"
    else
        echo "unknown"
    fi
}

build_images() {
    log_info "Building Docker images..."

    CLUSTER_TYPE=$(detect_cluster_type)
    log_info "Detected cluster type: $CLUSTER_TYPE"

    # For minikube, use minikube's docker daemon
    if [ "$CLUSTER_TYPE" = "minikube" ]; then
        log_info "Configuring Docker to use minikube's daemon..."
        eval $(minikube docker-env)
    fi

    # Build backend image
    log_info "Building aci-backend image..."
    docker build -t aci-backend:latest \
        -f "$PROJECT_ROOT/aci-backend/deployments/Dockerfile" \
        "$PROJECT_ROOT/aci-backend/"

    # Build frontend image
    log_info "Building aci-frontend image..."
    docker build -t aci-frontend:latest \
        -f "$PROJECT_ROOT/aci-frontend/Dockerfile" \
        "$PROJECT_ROOT/aci-frontend/"

    # For kind, load images into cluster
    if [ "$CLUSTER_TYPE" = "kind" ]; then
        log_info "Loading images into kind cluster..."
        kind load docker-image aci-backend:latest
        kind load docker-image aci-frontend:latest
    fi

    log_success "Docker images built successfully"
}

apply_manifests() {
    log_info "Applying Kubernetes manifests..."

    # Apply using kustomize
    kubectl apply -k "$K8S_DIR"

    log_success "Kubernetes manifests applied"
}

wait_for_deployments() {
    log_info "Waiting for deployments to be ready..."

    # Wait for each deployment
    local deployments=("postgres" "redis" "mailpit" "n8n" "aci-backend" "aci-frontend")

    for deployment in "${deployments[@]}"; do
        log_info "Waiting for $deployment..."
        if [ "$deployment" = "postgres" ]; then
            kubectl rollout status statefulset/$deployment -n "$NAMESPACE" --timeout=300s || true
        else
            kubectl rollout status deployment/$deployment -n "$NAMESPACE" --timeout=300s || true
        fi
    done

    log_success "All deployments ready"
}

run_migrations() {
    log_info "Running database migrations..."

    # Wait for postgres to be ready
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgres -n "$NAMESPACE" --timeout=120s

    # Get postgres pod name
    POSTGRES_POD=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=postgres -o jsonpath='{.items[0].metadata.name}')

    # Copy and run migrations
    if [ -d "$PROJECT_ROOT/aci-backend/migrations" ]; then
        log_info "Copying migrations to postgres pod..."
        kubectl cp "$PROJECT_ROOT/aci-backend/migrations" "$NAMESPACE/$POSTGRES_POD:/tmp/migrations"

        log_info "Running migrations..."
        kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- bash -c "
            cd /tmp/migrations &&
            for f in *.up.sql; do
                echo \"Running: \$f\"
                psql -U newsletter_user -d armor_newsletter -f \"\$f\" || true
            done
        " || log_warn "Some migrations may have already been applied"
    fi

    log_success "Migrations complete"
}

setup_ingress() {
    log_info "Setting up ingress..."

    CLUSTER_TYPE=$(detect_cluster_type)

    if [ "$CLUSTER_TYPE" = "minikube" ]; then
        # Enable ingress addon for minikube
        minikube addons enable ingress || log_warn "Ingress addon may already be enabled"

        # Get minikube IP
        MINIKUBE_IP=$(minikube ip)
        log_info "Minikube IP: $MINIKUBE_IP"
        log_info ""
        log_warn "Add the following to your /etc/hosts file:"
        echo -e "${YELLOW}$MINIKUBE_IP newsletter.local${NC}"
    fi

    log_success "Ingress setup complete"
}

show_access_info() {
    log_info "==================================================="
    log_info "         DEPLOYMENT COMPLETE                       "
    log_info "==================================================="
    echo ""

    CLUSTER_TYPE=$(detect_cluster_type)

    if [ "$CLUSTER_TYPE" = "minikube" ]; then
        MINIKUBE_IP=$(minikube ip)
        echo -e "${GREEN}Access URLs (via NodePort):${NC}"
        echo "  Frontend:  http://$MINIKUBE_IP:30080"
        echo "  Backend:   http://$MINIKUBE_IP:30808"
        echo "  n8n:       http://$MINIKUBE_IP:30567"
        echo "  Mailpit:   http://$MINIKUBE_IP:30825"
        echo "  PostgreSQL: $MINIKUBE_IP:30432"
        echo ""
        echo -e "${GREEN}Access URLs (via Ingress):${NC}"
        echo "  Add to /etc/hosts: $MINIKUBE_IP newsletter.local"
        echo "  Frontend:  http://newsletter.local"
        echo "  Backend:   http://newsletter.local/api"
        echo "  n8n:       http://newsletter.local/n8n"
        echo "  Mailpit:   http://newsletter.local/mail"
    else
        echo -e "${GREEN}Access URLs (via NodePort):${NC}"
        echo "  Frontend:  http://localhost:30080"
        echo "  Backend:   http://localhost:30808"
        echo "  n8n:       http://localhost:30567"
        echo "  Mailpit:   http://localhost:30825"
        echo ""
        echo -e "${GREEN}For port-forwarding:${NC}"
        echo "  kubectl port-forward -n $NAMESPACE svc/aci-frontend 3000:80"
        echo "  kubectl port-forward -n $NAMESPACE svc/aci-backend 8080:80"
        echo "  kubectl port-forward -n $NAMESPACE svc/n8n 5678:5678"
        echo "  kubectl port-forward -n $NAMESPACE svc/mailpit 8025:8025"
    fi

    echo ""
    echo -e "${YELLOW}Useful commands:${NC}"
    echo "  kubectl get all -n $NAMESPACE              # View all resources"
    echo "  kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=aci-backend  # Backend logs"
    echo "  kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=n8n          # n8n logs"
    echo "  kubectl delete -k $K8S_DIR                 # Delete all resources"
    echo ""
}

# Main deployment flow
main() {
    echo ""
    echo "=========================================="
    echo "  AI Newsletter Automation Deployment    "
    echo "  Namespace: $NAMESPACE                  "
    echo "=========================================="
    echo ""

    case "${1:-deploy}" in
        deploy)
            check_prerequisites
            build_images
            apply_manifests
            wait_for_deployments
            run_migrations
            setup_ingress
            show_access_info
            ;;
        build)
            check_prerequisites
            build_images
            ;;
        apply)
            check_prerequisites
            apply_manifests
            wait_for_deployments
            ;;
        migrate)
            run_migrations
            ;;
        status)
            kubectl get all -n "$NAMESPACE"
            ;;
        logs)
            local component="${2:-aci-backend}"
            kubectl logs -n "$NAMESPACE" -l "app.kubernetes.io/name=$component" -f
            ;;
        delete)
            log_warn "Deleting all resources in namespace $NAMESPACE..."
            kubectl delete -k "$K8S_DIR" || true
            log_success "Resources deleted"
            ;;
        help|*)
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  deploy    - Full deployment (build images, apply manifests, run migrations)"
            echo "  build     - Build Docker images only"
            echo "  apply     - Apply Kubernetes manifests only"
            echo "  migrate   - Run database migrations only"
            echo "  status    - Show status of all resources"
            echo "  logs      - Stream logs (usage: $0 logs [component])"
            echo "  delete    - Delete all resources"
            echo "  help      - Show this help message"
            echo ""
            echo "Components for logs: aci-backend, aci-frontend, n8n, postgres, redis, mailpit"
            ;;
    esac
}

main "$@"
