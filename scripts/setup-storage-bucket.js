/**
 * Setup Script: Configure Supabase Storage Bucket
 * 
 * This script helps set up the 'question-images' bucket in Supabase Storage.
 * It requires the service role key to create buckets and configure policies.
 * 
 * Usage: node scripts/setup-storage-bucket.js
 * 
 * Environment variables required in .env.local:
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_URL) {
  console.error('Missing required environment variables. Please set:');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  console.error('- SUPABASE_URL');
  process.exit(1);
}

const BUCKET_NAME = 'question-images';

async function setupStorageBucket() {
  console.log('Setting up Supabase Storage bucket...');
  console.log('Bucket:', BUCKET_NAME);
  
  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Check if bucket exists
    console.log('\n1. Checking if bucket exists...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      throw listError;
    }
    
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    
    if (bucketExists) {
      console.log(`✓ Bucket '${BUCKET_NAME}' already exists`);
      
      // Check bucket configuration
      const bucket = buckets.find(b => b.name === BUCKET_NAME);
      console.log('  - Public:', bucket.public);
      console.log('  - File size limit:', bucket.file_size_limit ? `${bucket.file_size_limit / 1024 / 1024}MB` : 'Not set');
    } else {
      console.log(`Creating bucket '${BUCKET_NAME}'...`);
      
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760, // 10MB limit
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        throw createError;
      }
      
      console.log('✓ Bucket created successfully');
    }
    
    // Test bucket access
    console.log('\n2. Testing bucket access...');
    const testFileName = 'test-access.txt';
    const testContent = 'Bucket access test';
    
    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(testFileName, testContent, {
          contentType: 'text/plain',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Error uploading test file:', uploadError);
        throw uploadError;
      }
      
      console.log('✓ Upload test successful');
      
      // Test public URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(testFileName);
      
      console.log('✓ Public URL accessible:', publicUrl);
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([testFileName]);
      
      if (deleteError) {
        console.warn('Warning: Could not delete test file:', deleteError);
      } else {
        console.log('✓ Test file cleaned up');
      }
      
    } catch (error) {
      console.error('Bucket access test failed:', error);
      throw error;
    }
    
    console.log('\n✅ Storage bucket setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run the migration script: node scripts/migrate-images.js');
    console.log('2. Test with a single question first: node scripts/migrate-images.js --test <question-id>');
    console.log('3. Review the backup before running full migration');
    
  } catch (error) {
    console.error('\n❌ Storage bucket setup failed:', error);
    throw error;
  }
}

// Manual setup instructions
function printManualInstructions() {
  console.log('\n=== MANUAL SETUP INSTRUCTIONS ===\n');
  console.log('If the automatic setup fails, you can set up the bucket manually:\n');
  console.log('1. Go to your Supabase project dashboard');
  console.log('2. Navigate to Storage > Buckets');
  console.log('3. Click "New Bucket"');
  console.log('4. Set the following:');
  console.log('   - Name: question-images');
  console.log('   - Public bucket: YES');
  console.log('   - File size limit: 10MB');
  console.log('5. Click "Create Bucket"\n');
  console.log('6. After creation, click on the bucket and set up policies:');
  console.log('   - Allow public read access (if needed)');
  console.log('   - Configure RLS policies for authenticated write access\n');
  console.log('=====================================\n');
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--manual')) {
    printManualInstructions();
  } else {
    setupStorageBucket().catch(error => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
  }
}

module.exports = { setupStorageBucket, printManualInstructions };