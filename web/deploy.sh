#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# --- Configuration ---
REGION="${AWS_REGION:-eu-west-1}"
REPO_NAME="observability-copilot-web"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# --- Load .env.local ---
if [ -f .env.local ]; then
  echo "Loading .env.local..."
  set -a
  source .env.local
  set +a
else
  echo "Warning: .env.local not found — env vars must be set externally"
fi

# --- Resolve AWS account ID ---
if [ -z "${AWS_ACCOUNT_ID:-}" ]; then
  AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)
fi
if [ -z "${AWS_ACCOUNT_ID:-}" ]; then
  echo "Error: Could not determine AWS account ID."
  echo "Set AWS_ACCOUNT_ID or configure AWS credentials."
  exit 1
fi

export CDK_DEFAULT_ACCOUNT="$AWS_ACCOUNT_ID"
export CDK_DEFAULT_REGION="$REGION"

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}"

# --- Build Docker image ---
echo ""
echo "=== Building Docker image (linux/amd64) ==="
docker build --platform linux/amd64 -t "${REPO_NAME}:${IMAGE_TAG}" .

# --- Push to ECR ---
echo ""
echo "=== Pushing to ECR ==="
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

docker tag "${REPO_NAME}:${IMAGE_TAG}" "${ECR_URI}:${IMAGE_TAG}"
docker push "${ECR_URI}:${IMAGE_TAG}"

# --- CDK Deploy ---
echo ""
echo "=== Deploying with CDK ==="
cd "$SCRIPT_DIR/infra"

if [ ! -d "node_modules" ]; then
  echo "Installing CDK dependencies..."
  npm install
fi

npx cdk deploy --require-approval never --outputs-file cdk-outputs.json

# --- Print results ---
echo ""
echo "=== Deployment complete ==="

if [ -f cdk-outputs.json ]; then
  SERVICE_URL=$(node -e "
    const o = require('./cdk-outputs.json');
    const stack = o['ObservabilityCopilotStack'] || {};
    console.log(stack.ServiceUrl || 'unknown');
  ")
  echo ""
  echo "App Runner URL: ${SERVICE_URL}"
  echo ""

  if [ "${NEXTAUTH_URL:-}" = "https://placeholder.awsapprunner.com" ] || [ -z "${NEXTAUTH_URL:-}" ]; then
    echo "-----------------------------------------------"
    echo "FIRST DEPLOY: NEXTAUTH_URL needs updating!"
    echo ""
    echo "1. Update .env.local:"
    echo "   NEXTAUTH_URL=${SERVICE_URL}"
    echo ""
    echo "2. Update GitHub OAuth app callback URL to:"
    echo "   ${SERVICE_URL}/api/auth/callback/github"
    echo ""
    echo "3. Re-run: ./deploy.sh"
    echo "-----------------------------------------------"
  fi
fi
