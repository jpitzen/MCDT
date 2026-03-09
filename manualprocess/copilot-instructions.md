# Copilot Instructions

TAKE NO ACTIONS UNLESS DIRECTED.  Be verbose in your thinking and status.

## Troubleshooting Guidance
- When diagnosing issues: First reproduce locally with `docker logs <container>` and `docker inspect <container>`.
- Common build failures: Check layer caching, .dockerignore, permission issues.
- Runtime errors: Verify environment variables, port bindings, volume mounts.
- Performance issues: Use `docker stats`, check for memory leaks, optimize layers.
- Vulnerability alerts: Run scans and upgrade base images/packages promptly.
- Always suggest checking container logs first, then restarting with fresh build if needed.
- For network issues: Test with `docker exec -it <container> curl ...`

## Additional Guidance for Copilot
- When modifying Dockerfile or deployment configs: Explain changes, reference Docker best practices, and suggest testing with `docker build` and `docker run`.
- For troubleshooting tasks: Ask clarifying questions if logs/details are missing; propose step-by-step diagnostic commands.
- Prioritize security and efficiency in all suggestions.
## Port Forwarding Guidance
- Always use port 8081 for ZL UI service port forwarding
- Before starting new port forwarding, kill any existing port forwarding processes on the target port
- Start all port forwarding in a new window to avoid blocking the main terminal
- Open port forwarding in an external terminal window to avoid blocking the main terminal
- Use command: `kubectl port-forward svc/zlui 8081:8081` in a new external terminal window