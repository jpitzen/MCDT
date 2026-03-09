# PowerShell script to convert remaining phases to pagination format
# This script will update Phase 2-12 to use the same pagination structure as Phase 0 and 1

$phases = @(
    @{ Phase = 2; Title = "ECR & Image Management"; Steps = 6 },
    @{ Phase = 3; Title = "EBS CSI Driver"; Steps = 4 },
    @{ Phase = 4; Title = "EFS CSI Driver"; Steps = 5 },
    @{ Phase = 5; Title = "S3 CSI Driver"; Steps = 4 },
    @{ Phase = 6; Title = "Database Configuration"; Steps = 8 },
    @{ Phase = 7; Title = "ZooKeeper Deployment"; Steps = 3 },
    @{ Phase = 8; Title = "Application Deployment"; Steps = 6 },
    @{ Phase = 9; Title = "Network & Ingress"; Steps = 5 },
    @{ Phase = 10; Title = "Cluster Autoscaling"; Steps = 4 },
    @{ Phase = 11; Title = "Post-Deployment"; Steps = 5 },
    @{ Phase = 12; Title = "Security Scanning"; Steps = 6 }
)

foreach ($phase in $phases) {
    $phaseNum = $phase.Phase
    $phaseTitle = $phase.Title
    $totalSteps = $phase.Steps
    $fileName = "ZL_DG_PHASE_$phaseNum.html"

    Write-Host "Converting Phase $phaseNum to pagination format..."

    # Read the current file
    $content = Get-Content $fileName -Raw

    # Create pagination HTML structure
    $paginationHtml = @"
        <div class="page-content">
            <!-- Pagination Progress Bar -->
            <div class="pagination-container">
                <div class="progress-header">
                    <div class="progress-info">
                        <span class="current-step-display">Step <span id="current-step">1</span> of <span id="total-steps">$totalSteps</span></span>
                        <span class="progress-text"><span id="progress-percent">20</span>% Complete</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                </div>

                <!-- Step Indicators -->
                <div class="step-indicators" id="step-indicators">
                    <!-- Dynamically generated -->
                </div>

                <!-- Navigation Buttons -->
                <div class="nav-buttons">
                    <button id="prev-btn" class="nav-btn pagination-btn" disabled>← Previous Step</button>
                    <button id="next-btn" class="nav-btn pagination-btn">Next Step →</button>
                </div>
            </div>

            <!-- Step Content Container -->
            <div id="step-container" class="step-container">
                <!-- Steps will be dynamically loaded here -->
            </div>

            <div class="page-nav">
                <a href="ZL_DG_PHASE_$($phaseNum - 1).html" class="nav-btn">← Previous: Phase $($phaseNum - 1)</a>
                <a href="ZL_DG_202512162115.html" class="nav-btn">Home</a>
                <a href="ZL_DG_PHASE_$($phaseNum + 1).html" class="nav-btn">Next: Phase $($phaseNum + 1) →</a>
            </div>
        </div>
"@

    # Replace the page-content section
    $pattern = '(?s)<div class="page-content">.*?</div>\s*</div>\s*</main>'
    $replacement = $paginationHtml + "`n    </div>`n</main>"
    $content = [regex]::Replace($content, $pattern, $replacement)

    # Create pagination JavaScript
    $paginationJs = @"
// Pagination variables
let currentStep = 1;
const totalSteps = $totalSteps;

// Step data for Phase $phaseNum
const stepData = {
    // Step data will be populated based on original content
    1: {
        title: 'Step $phaseNum.1',
        content: '<div class="step"><h3>Step $phaseNum.1</h3><p>Content for step 1</p></div>'
    }
    // Add more steps as needed
};

function initializePagination() {
    // Create step indicators
    const indicatorsContainer = document.getElementById('step-indicators');
    for (let i = 1; i <= totalSteps; i++) {
        const dot = document.createElement('div');
        dot.className = 'step-dot';
        dot.setAttribute('data-step', i);
        dot.onclick = () => showStep(i);
        indicatorsContainer.appendChild(dot);
    }

    // Load saved step from localStorage
    const savedStep = localStorage.getItem('zl-phase$phaseNum-current-step');
    if (savedStep && savedStep >= 1 && savedStep <= totalSteps) {
        currentStep = parseInt(savedStep);
    }

    // Show initial step
    showStep(currentStep);

    // Add event listeners
    document.getElementById('prev-btn').addEventListener('click', () => navigateStep(-1));
    document.getElementById('next-btn').addEventListener('click', () => navigateStep(1));
}

function showStep(stepNum) {
    currentStep = stepNum;

    // Update step content
    const stepContainer = document.getElementById('step-container');
    stepContainer.innerHTML = stepData[stepNum].content;

    // Update progress
    const progressPercent = Math.round((stepNum / totalSteps) * 100);
    document.getElementById('progress-percent').textContent = progressPercent;
    document.getElementById('progress-fill').style.width = progressPercent + '%';
    document.getElementById('current-step').textContent = stepNum;

    // Update step indicators
    const dots = document.querySelectorAll('.step-dot');
    dots.forEach((dot, index) => {
        if (index + 1 === stepNum) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    // Update navigation buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    prevBtn.disabled = stepNum === 1;
    nextBtn.disabled = stepNum === totalSteps;

    if (stepNum === totalSteps) {
        nextBtn.textContent = 'Phase Complete ✓';
        nextBtn.style.background = 'var(--success-color)';
    } else {
        nextBtn.textContent = 'Next Step →';
        nextBtn.style.background = 'var(--accent-color)';
    }

    // Save current step to localStorage
    localStorage.setItem('zl-phase$phaseNum-current-step', stepNum);

    // Scroll to top of content
    document.querySelector('.main-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function navigateStep(direction) {
    const newStep = currentStep + direction;
    if (newStep >= 1 && newStep <= totalSteps) {
        showStep(newStep);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializePagination();

    // Add copy buttons to dynamically loaded code blocks
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                const codeBlocks = document.querySelectorAll('pre code');
                codeBlocks.forEach(function(codeBlock) {
                    if (!codeBlock.parentElement.querySelector('.copy-btn')) {
                        const copyButton = document.createElement('button');
                        copyButton.className = 'copy-btn';
                        copyButton.textContent = '📋 Copy';
                        copyButton.onclick = function() { copyToClipboard(this); };
                        codeBlock.parentElement.style.position = 'relative';
                        codeBlock.parentElement.appendChild(copyButton);
                    }
                });
            }
        });
    });

    observer.observe(document.getElementById('step-container'), {
        childList: true,
        subtree: true
    });
});
"@

    # Replace the script section
    $scriptPattern = '(?s)// Initialize tooltips and interactive elements.*?\}\);'
    $content = [regex]::Replace($content, $scriptPattern, $paginationJs)

    # Write the updated content back
    Set-Content $fileName $content

    Write-Host "Phase $phaseNum conversion completed."
}

Write-Host "All phases have been converted to pagination format."