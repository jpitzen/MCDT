# Chat History

## Session Summary

### Date: December 16, 2025

### Key Points:
1. **Primary Focus**:
   - The user is working on an AWS EKS deployment project involving Kubernetes YAML files, SQL scripts, and deployment guides.

2. **Recent Tasks**:
   - Sanity check of the project was performed, revealing two main issues:
     - Duplicate `imagePullSecrets` keys in YAML files.
     - Inline CSS styles in `ZLAWSDeploy_Guide.html` that need to be moved to an external CSS file.

3. **Pending Issues**:
   - YAML errors and HTML refactoring tasks have been added to the to-do list for resolution.

4. **AWS CLI Commands**:
   - The user has been running AWS CLI commands to manage security groups and describe instance information. One command failed (`authorize-security-group-ingress` for port 3389), while others succeeded.

5. **Current File**:
   - The user is currently editing `03-AddrBookMsSql.sql`.

---

## Conversation Details

### Context:
- **Date**: December 16, 2025
- **Terminals**:
  - Terminal: pwsh
    - Last Command: `aws ec2 authorize-security-group-ingress --group-name usw1-zlps-winserver-sg --protocol tcp --port 3389 --cidr 192.168.0.0/16 --region us-west-1`
    - Exit Code: 1
  - Terminal: pwsh
    - Last Command: `aws ssm describe-instance-information --filters "Key=InstanceIds,Values=i-05f0a52e05bddf73b" --region us-west-1`
    - Exit Code: 0
  - Terminal: pwsh
    - Last Command: `aws ec2 authorize-security-group-ingress --group-id sg-0fdd6a32059a4a2e4 --protocol tcp --port 1433 --source-group sg-05a59c2a11fd2ccf8 --region us-east-1`
    - Exit Code: 0

### Workspace Structure:
```
commands/
	eksctl/
	policies/
	yaml/
	zlak/
	zldbcreate/
		app/
		filegroups/
		setuporder/
```

### Tasks:
1. **Sanity Check**:
   - Verified project setup.
   - Identified duplicate `imagePullSecrets` keys in YAML files.
   - Found inline CSS styles in `ZLAWSDeploy_Guide.html`.

2. **AWS CLI Commands**:
   - Managed security groups and instance information.
   - Resolved some issues, but one command failed.

3. **SQL Scripts**:
   - Currently editing `03-AddrBookMsSql.sql`.

---

### To-Do List:
1. Fix duplicate map keys in YAML files.
2. Refactor inline CSS styles in `ZLAWSDeploy_Guide.html`.

---

### Notes:
- The user is deploying a SQL Server database and Kubernetes application on AWS EKS.
- Focus on automation and resolving YAML/HTML issues.

---

### Commands:
- `aws ec2 authorize-security-group-ingress`
- `aws ssm describe-instance-information`

---

### Errors:
- YAML: Duplicate `imagePullSecrets` keys.
- HTML: Inline CSS styles.

---

### Next Steps:
1. Resolve YAML and HTML issues.
2. Verify AWS CLI commands.
3. Continue editing SQL scripts.