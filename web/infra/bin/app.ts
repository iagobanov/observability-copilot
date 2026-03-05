#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ObservabilityCopilotStack } from "../lib/stack";

const app = new cdk.App();

new ObservabilityCopilotStack(app, "ObservabilityCopilotStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
    region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || "eu-west-1",
  },
  appEnv: {
    githubId: process.env.GITHUB_ID || "",
    githubSecret: process.env.GITHUB_SECRET || "",
    nextauthSecret: process.env.NEXTAUTH_SECRET || "",
    nextauthUrl: process.env.NEXTAUTH_URL || "https://placeholder.awsapprunner.com",
    databaseUrl: process.env.DATABASE_URL || "",
    resultsApiKey: process.env.RESULTS_API_KEY || "",
  },
});
