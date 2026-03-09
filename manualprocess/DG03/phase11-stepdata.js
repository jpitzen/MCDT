// Phase 11 Step Data - to be inserted into ZL_DG_PHASE_11.html

        const stepData = [
            {
                title: "Step 59: Create Vault Directory Structure",
                content: `
                    <div class="step-section">
                        <div class="warning-section" style="margin: 20px 0; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107;">
                            <h4>🔴 UPDATED - December 22, 2025: Vault Path Change</h4>
                            <p>The vault mount path has changed to <code>/var/opt/zlvault/</code></p>
                            <p>The application creates the <code>ZLVault/</code> subfolder with numbered folders (1-32).</p>
                        </div>
                        
                        <h3>Step 59: Create Vault Directory Structure</h3>
                        
                        <h4>❓ Why It's Needed</h4>
                        <p>The ZL Application expects specific directories in the vault for document storage. Mount point is <code>/var/opt/zlvault/</code>.</p>
                        
                        <h4>Create Vault Directories</h4>
                        <pre><code>kubectl exec deployment/zlserver -- bash -c 'mkdir -p /var/opt/zlvault/ZLVault/{1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32}'</code></pre>
                        
                        <div class="verification">
                            <h4>🔍 Verification</h4>
                            <pre><code># List vault structure
kubectl exec deployment/zlserver -- ls -la /var/opt/zlvault/ZLVault/

# Count directories (should be 32)
kubectl exec deployment/zlserver -- bash -c 'ls -d /var/opt/zlvault/ZLVault/*/ | wc -l'</code></pre>
                            <p><strong>Expected:</strong> 32 directories (1-32)</p>
                        </div>
                    </div>
                `
            },
            {
                title: "Step 60: Update Database Disk Volume Paths",
                content: `
                    <div class="step-section">
                        <h3>Step 60: Update Database Disk Volume Paths</h3>
                        <p>Update the diskvolume table in the database to reflect new EFS mount paths.</p>
                        
                        <h4>Update Database Paths</h4>
                        <pre><code>-- View current paths
SELECT dvid, dvpath FROM diskvolume WHERE dvpath LIKE '%ZLVault%';

-- Update paths to new mount point
UPDATE diskvolume
SET dvpath = REPLACE(dvpath, '/zlvault/Archive_Vault/ZLVault/', '/var/opt/zlvault/ZLVault/')
WHERE dvpath LIKE '/zlvault/Archive_Vault/ZLVault/%';

-- Verify update
SELECT dvid, dvpath FROM diskvolume;</code></pre>
                        
                        <div class="info-box">
                            <strong>📌 Note:</strong> Run these SQL statements against your RDS PostgreSQL database using your preferred SQL client or AWS console.
                        </div>
                    </div>
                `
            },
            {
                title: "Step 61: Restart Application Deployments",
                content: `
                    <div class="step-section">
                        <h3>Step 61: Restart Deployments After Configuration Changes</h3>
                        <p>Restart all application deployments to apply the new vault path configuration.</p>
                        
                        <h4>Restart Deployments</h4>
                        <pre><code>kubectl rollout restart deployment zlserver zltika zlui</code></pre>
                        
                        <div class="verification">
                            <h4>🔍 Verification</h4>
                            <pre><code># Watch rollout status
kubectl rollout status deployment zlui
kubectl rollout status deployment zlserver
kubectl rollout status deployment zltika

# Verify all pods running
kubectl get pods -n default</code></pre>
                        </div>
                    </div>
                `
            },
            {
                title: "Step 62: Upload NIST and ZL Models",
                content: `
                    <div class="step-section">
                        <h3>Step 62: Upload NIST Model and ZL Model</h3>
                        
                        <h4>📋 What It Does</h4>
                        <p>Uploads the NIST classification model and ZL model datasets required for document classification and content analysis features.</p>
                        
                        <h4>📌 Prerequisites</h4>
                        <ul>
                            <li>NIST model files available locally (e.g., <code>C:\\Projects\\aws-zl\\nistmodel</code>)</li>
                            <li>ZL model files available locally (e.g., <code>C:\\Projects\\aws-zl\\zlmodel\\zlmodel_v2_20170529\\zlmodel</code>)</li>
                            <li>All application pods running and healthy</li>
                        </ul>
                        
                        <h4>Step 62a: Get Pod Name</h4>
                        <pre><code>kubectl get pods</code></pre>
                        <p><strong>Note the zlui pod name</strong> (e.g., <code>zlui-6d468867b6-zwhtc</code>)</p>
                        
                        <h4>Step 62b: Copy Model Files to Pod</h4>
                        <pre><code># Copy ZL Model
kubectl cp .\\zlmodel\\zlmodel_v2_20170529\\zlmodel zlui-&lt;pod-id&gt;:/var/opt/zlmodel

# Copy NIST Model
kubectl cp .\\zlmodel\\NIST_Model zlui-&lt;pod-id&gt;:/var/opt/NIST_Model</code></pre>
                        
                        <div class="info-box">
                            <strong>📌 Important:</strong> Replace <code>&lt;pod-id&gt;</code> with your actual pod name from Step 62a.
                        </div>
                        
                        <h4>Step 62c: Verify Files Copied</h4>
                        <pre><code># Check ZL Model
kubectl exec deployment/zlui -- ls -la /var/opt/zlmodel/

# Check NIST Model
kubectl exec deployment/zlui -- ls -la /var/opt/NIST_Model/NIST_Model/</code></pre>
                        
                        <h4>Step 62d: Open the Gate</h4>
                        <pre><code>kubectl exec -it zlui-&lt;pod-id&gt; -- bash -c "cd /opt/ZipLip/bin && ./nextpage.sh -slocalhost:80 /app/util/gate.jsp open=true"</code></pre>
                        
                        <h4>Step 62e: Upload NIST Model</h4>
                        <pre><code># Exec into the pod
kubectl exec -it zlui-&lt;pod-id&gt; -- bash

# Inside the pod, upload NIST model
cd /var/opt
nextpage.sh -slocalhost:80 /app/util/bigdb/zldataset.jsp type=nist dir=/var/opt/NIST_Model/NIST_Model</code></pre>
                        
                        <h4>Step 62f: Upload ZL Model</h4>
                        <div class="warning-box">
                            <strong>⚠️ NOTE:</strong> The <code>zlmodel</code> directory must contain the <code>ZLModel</code> folder.<br>
                            Expected structure: <code>/var/opt/zlmodel/ZLModel/_root/PmDir.zar</code>
                        </div>
                        <pre><code># Inside the pod, upload ZL model
nextpage.sh -slocalhost:80 /app/util/bigdb/zldataset.jsp type=zlmodel dir=/var/opt/zlmodel</code></pre>
                        
                        <p><strong>Expected Output:</strong></p>
                        <pre><code>&lt;html&gt;
&lt;body&gt;
&lt;H1&gt;Done&lt;/H1&gt;
&lt;p&gt; Done
&lt;pre&gt;
Uploaded ZLModel from /var/opt/zlmodel
&lt;/pre&gt;
&lt;/body&gt;&lt;/html&gt;</code></pre>
                        
                        <h4>Step 62g: Verify Model Upload</h4>
                        <pre><code># Inside pod - verify models are loaded
nextpage.sh -slocalhost:80 /app/util/bigdb/zldataset.jsp type=verify</code></pre>
                        
                        <div class="success-box">
                            <strong>✅ Success Indicators:</strong>
                            <ul>
                                <li>HTML response shows <code>&lt;H1&gt;Done&lt;/H1&gt;</code></li>
                                <li>Output shows "Uploaded ZLModel from /var/opt/zlmodel"</li>
                                <li>Models visible in application admin interface</li>
                                <li>Classification features operational</li>
                            </ul>
                        </div>
                    </div>
                `
            },
            {
                title: "Step 63: Phase 11 Completion Checklist",
                content: `
                    <div class="step-section">
                        <h3>Step 63: Phase 11 Completion Checklist</h3>
                        
                        <div class="checklist">
                            <h4>✅ Post-Deployment Verification</h4>
                            <ul>
                                <li>✓ Vault directory structure created (32 folders in /var/opt/zlvault/ZLVault/)</li>
                                <li>✓ Database diskvolume paths updated to new mount point</li>
                                <li>✓ All deployments restarted with new configuration</li>
                                <li>✓ NIST model uploaded successfully</li>
                                <li>✓ ZL model uploaded and verified</li>
                            </ul>
                        </div>
                        
                        <div class="success-box" style="margin-top: 30px;">
                            <h4>🎉 Deployment Complete!</h4>
                            <p>Your ZL Application is now fully deployed and configured on AWS EKS!</p>
                            <p><strong>Access your application at:</strong><br>
                            <code>http://&lt;YOUR_ALB_DNS_NAME&gt;</code></p>
                            <p style="margin-top: 15px;"><strong>Next:</strong> Proceed to <a href="ZL_DG_PHASE_12.html">Phase 12: Security Scanning</a> to ensure compliance.</p>
                        </div>
                        
                        <h4>Final Verification</h4>
                        <pre><code># Check all pod status
kubectl get pods -A

# Check application logs
kubectl logs deployment/zlui --tail=50
kubectl logs deployment/zlserver --tail=50

# Test application access (replace with your ALB DNS)
curl -I http://&lt;YOUR_ALB_DNS_NAME&gt;</code></pre>
                    </div>
                `
            }
        ];
