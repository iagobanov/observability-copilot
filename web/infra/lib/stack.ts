import * as cdk from "aws-cdk-lib";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apprunner from "aws-cdk-lib/aws-apprunner";
import { Construct } from "constructs";

export interface AppEnvProps {
  githubId: string;
  githubSecret: string;
  nextauthSecret: string;
  nextauthUrl: string;
  databaseUrl: string;
  resultsApiKey: string;
}

interface ObservabilityCopilotStackProps extends cdk.StackProps {
  appEnv: AppEnvProps;
}

export class ObservabilityCopilotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ObservabilityCopilotStackProps) {
    super(scope, id, props);

    const { appEnv } = props;

    // --- ECR Repository ---
    const repository = new ecr.Repository(this, "WebRepository", {
      repositoryName: "observability-copilot-web",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          maxImageCount: 5,
          description: "Keep last 5 images",
        },
      ],
    });

    // --- IAM Role for App Runner ECR access ---
    const accessRole = new iam.Role(this, "AppRunnerEcrAccessRole", {
      assumedBy: new iam.ServicePrincipal("build.apprunner.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSAppRunnerServicePolicyForECRAccess"
        ),
      ],
    });

    // --- Auto-scaling configuration ---
    const autoScalingConfig = new apprunner.CfnAutoScalingConfiguration(
      this,
      "AutoScalingConfig",
      {
        autoScalingConfigurationName: "observability-copilot-scaling",
        minSize: 1,
        maxSize: 2,
        maxConcurrency: 100,
      }
    );

    // --- App Runner Service ---
    const service = new apprunner.CfnService(this, "WebService", {
      serviceName: "observability-copilot-web",
      sourceConfiguration: {
        authenticationConfiguration: {
          accessRoleArn: accessRole.roleArn,
        },
        imageRepository: {
          imageIdentifier: `${repository.repositoryUri}:latest`,
          imageRepositoryType: "ECR",
          imageConfiguration: {
            port: "3000",
            runtimeEnvironmentVariables: [
              { name: "GITHUB_ID", value: appEnv.githubId },
              { name: "GITHUB_SECRET", value: appEnv.githubSecret },
              { name: "NEXTAUTH_SECRET", value: appEnv.nextauthSecret },
              { name: "NEXTAUTH_URL", value: appEnv.nextauthUrl },
              { name: "DATABASE_URL", value: appEnv.databaseUrl },
              { name: "RESULTS_API_KEY", value: appEnv.resultsApiKey },
            ],
          },
        },
      },
      instanceConfiguration: {
        cpu: "0.25 vCPU",
        memory: "0.5 GB",
      },
      healthCheckConfiguration: {
        protocol: "HTTP",
        path: "/",
        interval: 10,
        timeout: 5,
        healthyThreshold: 1,
        unhealthyThreshold: 5,
      },
      autoScalingConfigurationArn: autoScalingConfig.attrAutoScalingConfigurationArn,
    });

    service.node.addDependency(accessRole);

    // --- Outputs ---
    new cdk.CfnOutput(this, "EcrRepositoryUri", {
      value: repository.repositoryUri,
      description: "ECR repository URI",
    });

    new cdk.CfnOutput(this, "ServiceUrl", {
      value: `https://${service.attrServiceUrl}`,
      description: "App Runner service URL",
    });

    new cdk.CfnOutput(this, "ServiceArn", {
      value: service.attrServiceArn,
      description: "App Runner service ARN",
    });
  }
}
