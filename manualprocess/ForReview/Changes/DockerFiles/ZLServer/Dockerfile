FROM tomcat:9.0.111-jdk21

ENV ZIPLIP_HOME=/opt/ZipLip
ENV PATH="/opt/ZipLip/bin:${PATH}"

COPY ["./dist/bin/config/Tomcat9.0/conf/Catalina/localhost/ps.xml", "/usr/local/tomcat/conf/Catalina/localhost/ps.xml"]
RUN sed -i -e "s/C:/\/opt/g" /usr/local/tomcat/conf/Catalina/localhost/ps.xml

COPY ./ZLServer/wait-for-it.sh wait-for-it.sh

COPY ./ZLServer/zlserver-startup.sh /opt/ZipLip/bin/zlserver-startup.sh
RUN sed -i 's/\r$//' /opt/ZipLip/bin/zlserver-startup.sh


COPY ./dist/Tools/zlserver /opt/ZipLip/zlserver

COPY ./dist/bin /opt/ZipLip/bin
RUN sed -i -e "s/E:\/junk\/zk\/zkQuorum.cfg/\/opt\/ZipLip\/ZLZooKeeper\/config\/zkQuorum.cfg/g" /opt/ZipLip/bin/zk/zkClient.cfg

COPY ./dist/ZLZooKeeper/config/zkQuorum.cfg /opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg
RUN sed -i -e "s/E:/\/var\/ZipLip/g" -e "s/ohio/zlzookeeper/g" /opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg

COPY ./dist/zlserver /opt/ZipLip/zlserver
RUN sed -i -e 's/C:\\/\/opt\//g' -e "s/C:/\/opt/g" /opt/ZipLip/zlserver/WEB-INF/web.xml
RUN sed -i -e "s/E:\/junk\/zk\/zkQuorum.cfg/\/opt\/ZipLip\/ZLZooKeeper\/config\/zkQuorum.cfg/g" -e "/\/\/fs.unix.on/c\#define fs.unix.on = true" /opt/ZipLip/zlserver/WEB-INF/config/runnable/pmapp/pmapp.cfg

# Enforce MSSQL TrustServerCertificate (final, deterministic)
RUN sed -i \
  -e '/^_db\.param\.jdbcUrl=jdbc:sqlserver:\/\/[^;]*:1433$/d' \
  -e 's|^//\(_db\.param\.jdbcUrl=jdbc:sqlserver://[^;]*:1433;TrustServerCertificate=true\)|\1|g' \
  /opt/ZipLip/bin/zk/tcdb.cfg

CMD ["bash", "/opt/ZipLip/bin/zlserver-startup.sh"]



