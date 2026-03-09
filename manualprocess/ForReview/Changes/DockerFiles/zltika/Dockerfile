# Base image uses build args
FROM azul/zulu-openjdk-alpine:21.0.9-jre

# Environment variables
ENV ZIPLIP_HOME=/opt/ZipLip

# Copy ZL Tika Files
COPY dist/ZLTikaConvertor /opt/ZipLip/ZLTikaConvertor
WORKDIR /opt/ZipLip/ZLTikaConvertor/bin
CMD ["./zltikadiag.sh"]
