---
name: deploy
description: This skill should be used when the app is ready to be deployed or updated, or when asked to deploy. Uses cb-deploy cli to manage production and development environments.
---

# Deploy App

## When to use
When the application is ready to be deployed or updated, or when asked to deploy.

## Prerequisites
- A Dockerfile must exist in the project root

## Commands
- Deploy to development: `cb-deploy dev`
- Deploy to production: `cb-deploy prod`
- Check deployment status: `cb-deploy status`
- Stop an environment: `cb-deploy stop prod` or `cb-deploy stop dev`
- View app logs: `cb-deploy logs prod` or `cb-deploy logs dev`

## Workflow
1. Always deploy to dev first: `cb-deploy dev`
2. Verify the dev app is working (check logs, test endpoints)
3. Once verified, deploy to production: `cb-deploy prod`
4. Confirm production is live: `cb-deploy status`

## Notes
- All networking, routing, and configuration is handled automatically
- Production apps become publicly accessible after deployment
- Development apps are only accessible from within this container
- Deploying again replaces the existing container (zero-downtime for dev, brief restart for prod)
