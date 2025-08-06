import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestAccount {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'patient' | 'health_personnel' | 'admin' | 'institution_admin';
  adminLevel?: 'admin' | 'superadmin';
  specialty?: string;
  providerType?: string;
  bio?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
}

const testAccounts: TestAccount[] = [
  // SuperAdmin
  {
    email: 'superadmin@doc-o-clock.com',
    password: 'SuperAdmin123!',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'admin',
    adminLevel: 'superadmin',
    bio: 'System SuperAdmin with full access',
    phone: '+1-555-0001',
    address: '123 Admin St',
    city: 'Admin City',
    state: 'AC'
  },
  
  // Regular Admin
  {
    email: 'admin@doc-o-clock.com',
    password: 'Admin123!',
    firstName: 'Regular',
    lastName: 'Admin',
    role: 'admin',
    adminLevel: 'admin',
    bio: 'System Administrator',
    phone: '+1-555-0002',
    address: '124 Admin St',
    city: 'Admin City',
    state: 'AC'
  },

  // Health Personnel - Doctor
  {
    email: 'dr.smith@doc-o-clock.com',
    password: 'Doctor123!',
    firstName: 'Dr. John',
    lastName: 'Smith',
    role: 'health_personnel',
    providerType: 'doctor',
    specialty: 'Cardiology',
    bio: 'Experienced cardiologist with 15 years of practice',
    phone: '+1-555-0101',
    address: '456 Medical Ave',
    city: 'Health City',
    state: 'HC'
  },

  // Health Personnel - Nurse
  {
    email: 'nurse.johnson@doc-o-clock.com',
    password: 'Nurse123!',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'health_personnel',
    providerType: 'nurse',
    specialty: 'Emergency Medicine',
    bio: 'Registered Nurse specializing in emergency care',
    phone: '+1-555-0102',
    address: '457 Medical Ave',
    city: 'Health City',
    state: 'HC'
  },

  // Health Personnel - Pharmacist
  {
    email: 'pharmacist.brown@doc-o-clock.com',
    password: 'Pharmacy123!',
    firstName: 'Michael',
    lastName: 'Brown',
    role: 'health_personnel',
    providerType: 'pharmacist',
    specialty: 'Clinical Pharmacy',
    bio: 'Licensed pharmacist with expertise in medication management',
    phone: '+1-555-0103',
    address: '458 Medical Ave',
    city: 'Health City',
    state: 'HC'
  },

  // Patients
  {
    email: 'patient.doe@example.com',
    password: 'Patient123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'patient',
    bio: 'Regular patient for general health maintenance',
    phone: '+1-555-0201',
    address: '789 Patient Blvd',
    city: 'Patient City',
    state: 'PC'
  },

  {
    email: 'patient.jane@example.com',
    password: 'Patient123!',
    firstName: 'Jane',
    lastName: 'Miller',
    role: 'patient',
    bio: 'Patient with chronic condition management needs',
    phone: '+1-555-0202',
    address: '790 Patient Blvd',
    city: 'Patient City',
    state: 'PC'
  },

  // Institution Admin
  {
    email: 'hospital.admin@example.com',
    password: 'Institution123!',
    firstName: 'Robert',
    lastName: 'Wilson',
    role: 'institution_admin',
    bio: 'Hospital administrator managing healthcare facility',
    phone: '+1-555-0301',
    address: '321 Hospital Way',
    city: 'Medical Center',
    state: 'MC'
  }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Starting test account setup...');
    
    const results = [];
    
    for (const account of testAccounts) {
      try {
        console.log(`Creating account for ${account.email}...`);
        
        // Create the user with admin privileges
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            first_name: account.firstName,
            last_name: account.lastName,
            role: account.role,
            admin_level: account.adminLevel
          }
        });

        if (authError) {
          console.error(`Auth error for ${account.email}:`, authError);
          results.push({
            email: account.email,
            success: false,
            error: authError.message
          });
          continue;
        }

        if (!authData.user) {
          results.push({
            email: account.email,
            success: false,
            error: 'No user returned from auth creation'
          });
          continue;
        }

        // Update the profile with complete information
        const profileData = {
          id: authData.user.id,
          email: account.email,
          first_name: account.firstName,
          last_name: account.lastName,
          role: account.role,
          admin_level: account.adminLevel,
          provider_type: account.providerType,
          specialty: account.specialty,
          bio: account.bio,
          phone: account.phone,
          address: account.address,
          city: account.city,
          state: account.state,
          is_profile_complete: true
        };

        const { error: profileError } = await supabaseClient
          .from('profiles')
          .upsert(profileData);

        if (profileError) {
          console.error(`Profile error for ${account.email}:`, profileError);
          results.push({
            email: account.email,
            success: false,
            error: `Profile creation failed: ${profileError.message}`
          });
          continue;
        }

        // Create health personnel application if needed
        if (account.role === 'health_personnel') {
          const applicationData = {
            user_id: authData.user.id,
            license_number: `LIC${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
            specialty: account.specialty || 'General Medicine',
            years_of_experience: Math.floor(Math.random() * 20) + 5,
            experience_level: 'expert',
            status: 'approved',
            documents_url: [`documents/${account.firstName.toLowerCase()}_${account.lastName.toLowerCase()}_license.pdf`],
            review_notes: 'Test account - automatically approved'
          };

          const { error: applicationError } = await supabaseClient
            .from('health_personnel_applications')
            .insert(applicationData);

          if (applicationError) {
            console.error(`Application error for ${account.email}:`, applicationError);
          }
        }

        // Create some sample medical records for patients
        if (account.role === 'patient') {
          const sampleRecords = [
            {
              patient_id: authData.user.id,
              record_type: 'Annual Checkup',
              title: 'Annual Physical Examination',
              description: 'Routine annual physical examination with lab work',
              visit_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              clinical_data: {
                vital_signs: {
                  blood_pressure: '120/80',
                  heart_rate: 72,
                  temperature: 98.6,
                  weight: 165,
                  height: 70
                },
                lab_results: {
                  cholesterol: 180,
                  glucose: 95,
                  hemoglobin: 14.2
                }
              },
              status: 'active'
            }
          ];

          for (const record of sampleRecords) {
            const { error: recordError } = await supabaseClient
              .from('comprehensive_medical_records')
              .insert(record);

            if (recordError) {
              console.error(`Medical record error for ${account.email}:`, recordError);
            }
          }

          // Add sample health metrics
          const healthMetrics = [
            {
              user_id: authData.user.id,
              metric_type: 'Blood Pressure',
              value: '120/80',
              unit: 'mmHg',
              recorded_at: new Date().toISOString()
            },
            {
              user_id: authData.user.id,
              metric_type: 'Weight',
              value: '165',
              unit: 'lbs',
              recorded_at: new Date().toISOString()
            },
            {
              user_id: authData.user.id,
              metric_type: 'Heart Rate',
              value: '72',
              unit: 'bpm',
              recorded_at: new Date().toISOString()
            }
          ];

          for (const metric of healthMetrics) {
            const { error: metricError } = await supabaseClient
              .from('health_metrics')
              .insert(metric);

            if (metricError) {
              console.error(`Health metric error for ${account.email}:`, metricError);
            }
          }
        }

        console.log(`✅ Successfully created account for ${account.email}`);
        results.push({
          email: account.email,
          success: true,
          userId: authData.user.id,
          role: account.role,
          adminLevel: account.adminLevel
        });

      } catch (error) {
        console.error(`Error creating account for ${account.email}:`, error);
        results.push({
          email: account.email,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    console.log(`Account creation completed: ${successCount}/${totalCount} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Test accounts setup completed: ${successCount}/${totalCount} successful`,
        results: results,
        loginCredentials: testAccounts.map(acc => ({
          email: acc.email,
          password: acc.password,
          role: acc.role,
          name: `${acc.firstName} ${acc.lastName}`
        }))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Setup error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})