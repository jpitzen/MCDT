import java.util.*;
import java.lang.reflect.*;

public class ReadZK {
    public static void main(String[] args) throws Exception {
        // Step 1: Get the actual root key by decrypting _zkRoot.m_stEncKey
        String zkRootEncKey = "ZxVtX6vsrpv+CFPxhwnT5mzuyOMsCxyERj6AH/a1adpImTIe5SBQ7lu0pZSb3mmyK8t0UgK7RV9OZEMP6HkdBA==";
        String hardcodedMaster = "IFWJ0ASRYBYU24RKU2MFLNX14RYG0VEWB";
        
        // Use ClientAuthUtil to decrypt
        Class<?> cau = Class.forName("wsi.security.ClientAuthUtil");
        Method decrypt = cau.getMethod("decrypt", byte[].class, String.class);
        
        byte[] encBytes = Base64.getDecoder().decode(zkRootEncKey);
        byte[] decryptedRootKey = (byte[]) decrypt.invoke(null, encBytes, hardcodedMaster);
        String actualRootKey = new String(decryptedRootKey, "UTF-8");
        
        System.out.println("Decrypted root key: " + actualRootKey);
        System.out.println("Root key length: " + actualRootKey.length());
        
        // Step 2: Now encrypt the password with the actual root key
        String password = "Passw0rd2024";
        Method encrypt = cau.getMethod("encrypt", byte[].class, String.class);
        
        byte[] passwordBytes = password.getBytes("UTF-8");
        byte[] encryptedPassword = (byte[]) encrypt.invoke(null, passwordBytes, actualRootKey);
        String encryptedPasswordB64 = Base64.getEncoder().encodeToString(encryptedPassword);
        
        System.out.println("\nEncrypted password (base64): " + encryptedPasswordB64);
        System.out.println("Encrypted length: " + encryptedPassword.length + " bytes");
        
        // Step 3: Verify by decrypting
        byte[] verifyDecrypt = (byte[]) decrypt.invoke(null, encryptedPassword, actualRootKey);
        System.out.println("Verified decryption: " + new String(verifyDecrypt, "UTF-8"));
        
        // Step 4: Create the new ZK data in AWS format (password encrypted, not in plaintext)
        String zkData = "zltc/db~~" + encryptedPasswordB64 + "~~{jdbcUrl|~|jdbc:sqlserver://mssql-service:1433;TrustServerCertificate=true|~|DatabaseName|~|ZLDB|~|user|~|pfuser}";
        System.out.println("\nNew ZK data:");
        System.out.println(zkData);
    }
}
