# Roadmap for DG02 Upgrade

## Date: December 16, 2025

### Objective
To create an improved and maintainable version of the deployment guide (`ZLAWSDeploy_Guide.html`) in the `DG02` folder. The new version will follow a modular structure, use external stylesheets, and include deployment instructions for hosting on Windows IIS.

---

### Proposed Structure

#### 1. File Organization
- **HTML Files:**
  - `ZL_DG_20251216200.html`: Main deployment guide.
  - `ZL_DG_PHASE_0.html`: Phase-specific content (e.g., prerequisites).
  - Additional phase files as needed.
- **CSS Files:**
  - `ZL_DG_20251216200.css`: External stylesheet for consistent styling.
- **Assets Folder:**
  - Images, scripts, and other resources.

#### 2. HTML Structure
- **Header:**
  - Title and navigation links.
- **Sidebar Navigation:**
  - Links to different sections/phases.
- **Main Content:**
  - Modular sections for each phase of the deployment.
- **Footer:**
  - Contact information and version details.

---

### Deployment Instructions for Windows IIS

#### 1. Prerequisites
- Install IIS on the Windows server.
- Ensure the `Static Content` role service is enabled.
- Place all files (HTML, CSS, assets) in a single directory (e.g., `C:\inetpub\wwwroot\DG02`).

#### 2. Steps
1. **Copy Files:**
   - Copy the `DG02` folder to `C:\inetpub\wwwroot\`.
2. **Configure IIS:**
   - Open IIS Manager.
   - Add a new site or configure the default site to point to `C:\inetpub\wwwroot\DG02`.
   - Set the default document to `ZL_DG_20251216200.html`.
3. **Test Deployment:**
   - Open a browser and navigate to `http://<server-ip>/DG02/ZL_DG_20251216200.html`.

---

### Updated Phased Approach

#### Phase 1: Initial Setup
- Create the main HTML file (`ZL_DG_20251216200.html`) with placeholders for content.
- Link an external CSS file for styling.
- Define the basic structure, including header, sidebar, and main content sections.

#### Phase 2: Content Migration
- Migrate content from `ZLAWSDeploy_Guide.html` to the new modular structure.
- Break down the content into logical sections and phases.
- Ensure all YAML examples, code snippets, and troubleshooting steps are accurately transferred.

#### Phase 3: Styling and Assets
- Design and implement the external CSS file (`ZL_DG_20251216200.css`).
  - Include styles for headers, tables, alerts, and navigation.
- Add images and other assets to the `assets` folder.
- Optimize the layout for both desktop and mobile devices.

#### Phase 4: IIS Deployment
- Deploy the new guide to Windows IIS.
- Test the deployment to ensure functionality.
- Verify that all links, images, and assets are correctly loaded.

#### Phase 5: Review and Feedback
- Review the new guide with stakeholders.
- Incorporate feedback and finalize the structure.
- Document the changes and update the roadmap for future improvements.

---

### Additional Phase Files

The following `ZL_DG_PHASE(n)` files will be created to modularize the deployment guide:

1. **ZL_DG_PHASE_0.html**: Prerequisites and initial setup.
   - Overview of the deployment process.
   - Required tools, accounts, and permissions.

2. **ZL_DG_PHASE_1.html**: Cluster Setup.
   - Steps to create and configure the AWS EKS cluster.
   - YAML examples for cluster configuration.

3. **ZL_DG_PHASE_2.html**: Application Deployment.
   - Deploying the ZL application to the EKS cluster.
   - Configuring services, deployments, and ingress.

4. **ZL_DG_PHASE_3.html**: Storage Configuration.
   - Setting up persistent volumes and claims.
   - Configuring EBS and EFS storage classes.

5. **ZL_DG_PHASE_4.html**: Security and IAM Policies.
   - Configuring IAM roles and policies.
   - Setting up security groups and network policies.

6. **ZL_DG_PHASE_5.html**: Monitoring and Troubleshooting.
   - Setting up monitoring tools (e.g., CloudWatch, Prometheus).
   - Common troubleshooting steps and solutions.

7. **ZL_DG_PHASE_6.html**: Final Review and Validation.
   - Checklist for verifying the deployment.
   - Steps to validate application functionality.

---

### Notes
- Maintain the original file (`ZLAWSDeploy_Guide.html`) without alterations.
- Ensure all new files are cohesive and easy to maintain.
- Document all changes and decisions for future reference.