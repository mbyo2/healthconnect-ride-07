
import { createSuperAdmin } from './createSuperAdmin';

// Specific credentials requested by user
const SUPERUSER_EMAIL = 'admin@doc-o-clock.internal';
const SUPERUSER_PASSWORD = 'Technology22??//';

export async function createSpecificSuperUser() {
    console.log("Creating specific superuser account...");

    try {
        const result = await createSuperAdmin(
            SUPERUSER_EMAIL,
            SUPERUSER_PASSWORD,
            "System",
            "SuperAdmin"
        );

        if (result.success) {
            console.log("✅ Superuser created successfully!");
            console.log(`📧 Email: ${SUPERUSER_EMAIL}`);
            console.log(`🔐 Password: ${SUPERUSER_PASSWORD}`);
            return true;
        } else {
            console.error("❌ Failed to create superuser:", result.error);
            return false;
        }
    } catch (error) {
        console.error("❌ Error creating superuser:", error);
        return false;
    }
}

// Execute if running directly
if (import.meta.env.DEV) {
    (window as any).createSpecificSuperUser = createSpecificSuperUser;
    console.log("Run createSpecificSuperUser() in console to create the account");
}
