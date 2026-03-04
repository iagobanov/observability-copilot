#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
REGION="${AWS_REGION:-eu-west-1}"
REPO_NAME="observability-copilot-web"
IMAGE_TAG="${IMAGE_TAG:-latest}"

if [ -z "${AWS_ACCOUNT_ID:-}" ]; then
  echo "Error: AWS_ACCOUNT_ID is required"
  echo "Usage: AWS_ACCOUNT_ID=123456789012 ./deploy.sh"
  exit 1
fi

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}"

# --- Authenticate with ECR ---
echo "Authenticating with ECR..."
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# --- Build & Push ---
echo "Building image for linux/amd64..."
docker build --platform linux/amd64 -t "${REPO_NAME}:${IMAGE_TAG}" .

docker tag "${REPO_NAME}:${IMAGE_TAG}" "${ECR_URI}:${IMAGE_TAG}"

echo "Pushing to ECR..."
docker push "${ECR_URI}:${IMAGE_TAG}"

# --- Trigger App Runner deployment (if service exists) ---
SERVICE_ARN=$(aws apprunner list-services --region "$REGION" \
  --query "ServiceSummaryList[?ServiceName=='${REPO_NAME}'].ServiceArn | [0]" \
  --output text 2>/dev/null || true)

if [ -n "$SERVICE_ARN" ] && [ "$SERVICE_ARN" != "None" ]; then
  echo "Triggering App Runner deployment..."
  aws apprunner start-deployment --service-arn "$SERVICE_ARN" --region "$REGION"
  echo "Deployment triggered. Check status with:"
  echo "  aws apprunner describe-service --service-arn $SERVICE_ARN --region $REGION"
else
  echo ""
  echo "Image pushed. No App Runner service found — create one with:"
  echo ""
  cat <<'SETUP'
# 1. Create ECR repo (if first time)
aws ecr create-repository --repository-name observability-copilot-web --region $REGION

# 2. Create IAM role for App Runner ECR access
aws iam create-role \
  --role-name AppRunnerECRAccess \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "build.apprunner.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name AppRunnerECRAccess \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess

# 3. Create auto-scaling config (min 0 enables auto-pause)
aws apprunner create-auto-scaling-configuration \
  --auto-scaling-configuration-name copilot-web-scaling \
  --min-size 0 --max-size 1 --max-concurrency 100 \
  --region $REGION

# 4. Create the App Runner service
aws apprunner create-service \
  --service-name observability-copilot-web \
  --source-configuration '{
    "AuthenticationConfiguration": {
      "AccessRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/AppRunnerECRAccess"
    },
    "ImageRepository": {
      "ImageIdentifier": "YOUR_ECR_URI:latest",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "3000",
        "RuntimeEnvironmentVariables": {
          "GITHUB_ID": "...",
          "GITHUB_SECRET": "...",
          "NEXTAUTH_SECRET": "...",
          "NEXTAUTH_URL": "https://YOUR_APP_RUNNER_URL"
        }
      }
    }
  }' \
  --instance-configuration '{"Cpu": "0.25 vCPU", "Memory": "0.5 GB"}' \
  --health-check-configuration '{"Protocol": "HTTP", "Path": "/"}' \
  --region $REGION

# 5. After deploy: update NEXTAUTH_URL and GitHub OAuth callback URL
SETUP
fi

echo ""
echo "Done!"
