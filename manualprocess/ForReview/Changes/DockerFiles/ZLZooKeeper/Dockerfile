# Base image uses build args
FROM azul/zulu-openjdk-alpine:21.0.9-jre

# Environment variables
ENV ZIPLIP_HOME=/opt/ZipLip
RUN apk add --no-cache bash

# Copy ZL ZooKeeper Files

COPY ./dist/ZLZooKeeper /opt/ZipLip/ZLZooKeeper
COPY ./ZLZooKeeper/zookeeper-startup.sh /opt/ZipLip/ZLZooKeeper/bin/zookeeper-startup.sh
RUN sed -i -e "s/E:\/junk\/zk\/zkQuorum.cfg/\/opt\/ZipLip\/ZLZooKeeper\/config\/zkQuorum.cfg/g" /opt/ZipLip/ZLZooKeeper/config/zk.cfg
RUN sed -i -e "s/E:/\/var\/ZipLip/g" -e "s/ohio/zlzookeeper/g" /opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg
WORKDIR /opt/ZipLip/ZLZooKeeper/bin
CMD ["bash", "/opt/ZipLip/ZLZooKeeper/bin/zookeeper-startup.sh"]