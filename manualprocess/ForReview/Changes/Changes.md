Bootstrap Job Implementation logic:
We will use a one-time Kubernetes Job to handle ZooKeeper initialization. The Job will run only during the initial setup and will not be part of the runtime startup.
As part of this change the following occur:
•	Docker image files will be updated
•	New Kubernetes YAML files will be created
•	Complete documentation will be prepared for future reference

Workflow:
•	A  one-time Kubernetes Job will run using the same zlserver image
•	A dedicated zookeeperconfig folder will be created and mounted
•	The same ZooKeeper config and data volumes will be shared between:

ZooKeeper pods
ZLServer pods
Bootstrap Job

This ensures consistent configuration and avoids repeated initialization during restarts.
 
Validation Logic:
Key generation will be performed at the ZooKeeper level, and the quorum configuration file will be updated using.
•	  zkutil.sh -g

The following commands will be executed during the ZL Server bootstrap process

        zkutil.sh -keyinit
        zkutil.sh -loadconfig

Implemented Changes:
Image Changes:
•	Removed ZooKeeper initialization logic from zlserver startup
•	Added zkutil support to ZooKeeper image
•	Removed hostname update from zlserver Startup.
•	Enabled MSSQL TrustServerCertificate in tcdb.cfg

Kubernetes YAML Changes:
•	Added Bootstrap Job YAML (runs once during setup)
•	Added EFS initialization YAMLs to create required directories
•	Ensured consistent volume mounts across ZooKeeper, ZLServer, and Bootstrap Job

Issues & Fixes:

Issue 	Issue Description	Fix
ZooKeeper initialization running on every zlserver restart	•	ZooKeeper initialization logic was part of zlserver-startup.sh
•	This caused initialization to run repeatedly on pod restarts, redeployments, and scaling
	•	Removed ZooKeeper initialization logic from zlserver-startup.sh
•	ZooKeeper initialization is now handled only by the Bootstrap Job (runs once)
zkutil.sh not available initially with ZooKeeper	•	Initially, zkutil -g was not available with the ZooKeeper setup
•	This blocked key generation and quorum configuration during initialization
	•	Added zkutil support into the ZooKeeper image
•	ZooKeeper now generates new keys and updates the quorum configuration
•	ZLServer completes the remaining initialization process after ZooKeeper setup
(netty-codec-4.2.6.Final.jar file is missing in zookeeper library folder, zkutil.sh(.bat) file also we need to maintain in ZooKeeper bin folder.)

 ZipLip/bin/zk folder inside Docker image	•	ZipLip/bin/zk was packaged inside the Docker image
•	Any config or state changes were lost on pod restart
•	Small configuration changes required rebuilding the image	•	Created an EFS-backed persistent volume
•	Moved ZipLip/bin/zk from the image to EFS
•	The same EFS volume is mounted into ZooKeeper, ZLServer, and the Bootstrap Job
Startup scripts modifying EFS-backed config files	•	Startup scripts were modifying config files stored on EFS
•	Since EFS is shared and persistent, these changes became permanent and caused issues over time
	•	EFS-backed config files are now treated as static and read-only
•	Runtime-specific changes were removed from startup scripts
•	One-time setup is handled only through the Bootstrap Job.
Hostname values getting added repeatedly to config files	•	Hostname values were being written into config files such as pmapp.cfg
•	On every restart, hostname values were appended again
•	This resulted in very long paths and Bad Temp Directory errors	•	Stopped writing hostname values into config files
•	pmapp.cfg now contains only the base path (WEB-INF/tmp)
•	TMP directories are created dynamically at startup using hostname, without modifying shared config

MSSQL TrustServerCertificate handling	•	With newer MSSQL JDBC drivers (10.2+), SSL validation caused DB connection issues
•	TrustServerCertificate=true was commented in tcdb.cfg	•	Updated /opt/ZipLip/bin/zk/tcdb.cfg to enable TrustServerCertificate=true
•	Default MSSQL JDBC URL was commented
•	This change is applied at Docker image level, not at runtime
•	Ensures consistent and stable DB connectivity across environments

Notes:
•	ZooKeeper initialization happens only once during setup
•	ZooKeeper handles key generation and quorum updates
•	ZLServer completes the remaining initialization
•	Pods restart without re-running initialization
•	Configuration is persistent, stable, and reliable
