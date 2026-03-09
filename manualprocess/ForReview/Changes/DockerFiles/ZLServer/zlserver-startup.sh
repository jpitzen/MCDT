#!/bin/bash
set -e

CONTAINER_FIRST_STARTUP="CONTAINER_FIRST_STARTUP"

# -------------------------------------------------
# WAIT FOR ZK CONFIG FILE (EFS BACKED)
# -------------------------------------------------
ZK_TCDB="/opt/ZipLip/bin/zk/tcdb.cfg"

echo "Waiting for ZK config file: $ZK_TCDB"

i=0
while [ ! -f "$ZK_TCDB" ]; do
    i=$((i+1))
    if [ "$i" -ge 60 ]; then
        echo "ERROR: ZK config file not found after waiting 120 seconds"
        echo "Contents of /opt/ZipLip/bin/zk:"
        ls -l /opt/ZipLip/bin/zk || true
        exit 1
    fi
    sleep 2
done

echo "ZK config file found"

# Everything in the if loop will only run once on container creation
if [ ! -e /$CONTAINER_FIRST_STARTUP ]; then
    touch /$CONTAINER_FIRST_STARTUP

    echo "===== ZL Server first startup initialization ====="

    # -------------------------------------------------
    # Updating DB credentials
    # -------------------------------------------------

    sed -i -e "s/pfuser/$DB_USER/g" -e "s/pfpass/$DB_PASSWORD/g" /opt/ZipLip/bin/zk/tcdb.cfg
    sed -i -e "s/DB_MSSQL_DEFAULT	= true/DB_MSSQL_DEFAULT	= false/g" /opt/ZipLip/bin/zk/tcdb.cfg /opt/ZipLip/zlserver/WEB-INF/config/runnable/pmapp/pmapp.cfg

    # -------------------------------------------------
    # DB TYPE handling
    # -------------------------------------------------
    case "$DB_TYPE" in
        "oracle")
            sed -i -e "s/DB_ORACLE_DEFAULT	= false/DB_ORACLE_DEFAULT	= true/g" /opt/ZipLip/bin/zk/tcdb.cfg /opt/ZipLip/zlserver/WEB-INF/config/runnable/pmapp/pmapp.cfg
            sed -i -e "s/localhost:1521:ZLDB/$DB_HOST:$DB_PORT:$DB_NAME/g" /opt/ZipLip/bin/zk/tcdb.cfg ;;
        "pgsql"|"postgres")
            sed -i -e "s/DB_PGSQL_DEFAULT	= false/DB_PGSQL_DEFAULT	= true/g" /opt/ZipLip/bin/zk/tcdb.cfg /opt/ZipLip/zlserver/WEB-INF/config/runnable/pmapp/pmapp.cfg
            sed -i -e "s/localhost:7999\/ZLDB/$DB_HOST:$DB_PORT\/$DB_NAME/g" /opt/ZipLip/bin/zk/tcdb.cfg ;;
        "mssql")
            sed -i -e "s/DB_MSSQL_DEFAULT	= false/DB_MSSQL_DEFAULT	= true/g" /opt/ZipLip/bin/zk/tcdb.cfg /opt/ZipLip/zlserver/WEB-INF/config/runnable/pmapp/pmapp.cfg
            sed -i -e "s/localhost:1433/$DB_HOST:$DB_PORT/g" -e "s/DatabaseName=ZLDB/DatabaseName=$DB_NAME/g" /opt/ZipLip/bin/zk/tcdb.cfg ;;
        *)
    esac
    # -------------------------------------------------
    # Hostname-based TMP and LOG paths
    # -------------------------------------------------
    sed -i -e "s/ZipLip\/logs/ZipLip\/logs\/$HOSTNAME/g" /opt/ZipLip/zlserver/WEB-INF/web.xml
	
    # -------------------------------------------------
    # Executor counts (YAML override; defaults 8,5,8)
    # -------------------------------------------------
    INITIAL="${INITIAL_EXECUTORS:-8}"
    SERVICE="${SERVICE_EXECUTORS:-5}"
    MANAGED="${MANAGED_EXECUTORS:-8}"

    sed -i -E "s/(coord\.cluster\.initial\.executors[[:space:]]*=[[:space:]]*)[0-9]+/\1$INITIAL/" /opt/ZipLip/zlserver/WEB-INF/config/runnable/pmapp/pmapp.cfg
    sed -i -E "s/(coord\.cluster\.service\.executors[[:space:]]*=[[:space:]]*)[0-9]+/\1$SERVICE/" /opt/ZipLip/zlserver/WEB-INF/config/runnable/pmapp/pmapp.cfg
    sed -i -E "s/(coord\.cluster\.managed\.executors[[:space:]]*=[[:space:]]*)[0-9]+/\1$MANAGED/" /opt/ZipLip/zlserver/WEB-INF/config/runnable/pmapp/pmapp.cfg
	
    # -------------------------------------------------
    # Cluster Name
    # -------------------------------------------------
    if [ -n "$CLUSTER_NAME" ]; then
        sed -i \
          -e "s/coord.cluster.default.name  = DEFAULT/coord.cluster.default.name  = $CLUSTER_NAME/g" \
          /opt/ZipLip/zlserver/WEB-INF/config/runnable/pmapp/pmapp.cfg
    fi

    echo "===== ZL Server first startup initialization completed ====="
fi
# -------------------------------------------------
# TMP DIRECTORY (THIS IS THE ONLY CORRECT WAY)
# -------------------------------------------------
TMP_BASE="/opt/ZipLip/zlserver/WEB-INF/tmp"
TMP_DIR="${TMP_BASE}/${HOSTNAME}"

mkdir -p "${TMP_DIR}"
chmod 777 "${TMP_DIR}"

export ZL_TMP_DIR="${TMP_DIR}"
echo "ZLServer temp directory ensured: ${ZL_TMP_DIR}"
# Start Tomcat
# -------------------------------------------------
if [ -z "$DEVELOPMENT" ]; then
    catalina.sh run
else
    catalina.sh jpda run
fi
