import java.sql.*;
public class InitDB {
    public static void main(String[] args) {
        try {
            Class.forName("com.microsoft.sqlserver.jdbc.SQLServerDriver");
            Connection conn = DriverManager.getConnection(
                "jdbc:sqlserver://mssql-service:1433;databaseName=zldb;encrypt=false;trustServerCertificate=true",
                "sa",
                "YourStrong!Passw0rd"
            );

            Statement stmt = conn.createStatement();

            // Check tables
            ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'pfuser'");
            if(rs.next()) {
                System.out.println("Tables found: " + rs.getInt(1));
            }

            // Insert domain
            try {
                stmt.executeUpdate("INSERT INTO pfuser.DomainInfo (diId, diDomainName) VALUES (1, 'yourdomain.com')");
                System.out.println("Domain inserted");
            } catch(Exception e) {
                System.out.println("Domain exists or error: " + e.getMessage());
            }

            // Insert tenant
            try {
                stmt.executeUpdate("INSERT INTO pfuser.Tenant (tenId, tenName, tenDisplayName, tenRootDomainId, tenCreateDate) VALUES (1, 'default', 'Default Tenant', 1, GETDATE())");
                System.out.println("Tenant inserted");
            } catch(Exception e) {
                System.out.println("Tenant exists or error: " + e.getMessage());
            }

            // Insert superadmin
            try {
                stmt.executeUpdate("INSERT INTO pfuser.ZipAccount (zaAcctNo, zaUserId, zaDomainId, zaTenantId, zaEncPwd, zaAcctStatus, zaAcctLastModDate, zaAuditRecordLevel, zaAuditClearanceLevel) VALUES (1, 'superadmin', 1, 1, CONVERT(VARBINARY(255), 'superadmin'), 1, GETDATE(), 100, 100)");
                System.out.println("Superadmin inserted");
            } catch(Exception e) {
                System.out.println("Superadmin exists or error: " + e.getMessage());
            }

            conn.close();
            System.out.println("Done");

        } catch(Exception e) {
            e.printStackTrace();
        }
    }
}