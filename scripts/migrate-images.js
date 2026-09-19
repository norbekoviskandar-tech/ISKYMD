/**
 * Migration Script: Move base64 images to Supabase Storage
 * 
 * This script:
 * 1. Reads base64 images from questions (gallery, stemImage, explanation images, text fields)
 * 2. Compresses them to WebP (max 1400px wide, quality ~80)
 * 3. Uploads to Supabase Storage bucket "question-images"
 * 4. Replaces base64 with public URLs in both JSON fields and text fields
 * 5. Creates backup before migration
 * 
 * Usage: node scripts/migrate-images.js
 * Usage: node scripts/migrate-images.js --test <question-id>
 * 
 * Environment variables required in .env.local:
 * - DATABASE_URL: PostgreSQL connection string
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 * - SUPABASE_URL: Supabase project URL
 */

const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;

if (!DATABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_URL) {
  console.error('Missing required environment variables. Please set:');
  console.error('- DATABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  console.error('- SUPABASE_URL');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: DATABASE_URL,
});

const BUCKET_NAME = 'question-images';
const MAX_WIDTH = 1400;
const WEBP_QUALITY = 80;

// Helper: Extract base64 images from JSON fields
function extractBase64Images(obj, path = '') {
  const images = [];
  
  if (!obj || typeof obj !== 'object') return images;
  
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof value === 'string' && value.startsWith('data:image/')) {
      images.push({
        path: currentPath,
        data: value,
        mimeType: value.match(/^data:image\/(\w+);/)?.[1] || 'png'
      });
    } else if (typeof value === 'object' && value !== null) {
      images.push(...extractBase64Images(value, currentPath));
    }
  }
  
  return images;
}

// Helper: Extract base64 images from text fields
function extractBase64ImagesFromText(text, fieldName) {
  const images = [];
  
  if (!text || typeof text !== 'string') return images;
  
  // Regex to find |image:data:image/...;base64,...| patterns
  const regex = /\|image:(data:image\/[^;]+;base64,[^|]+)\|/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const dataUri = match[1];
    const mimeType = dataUri.match(/^data:image\/(\w+);/)?.[1] || 'png';
    
    images.push({
      fieldName,
      fullMatch,
      data: dataUri,
      mimeType,
      startIndex: match.index,
      endIndex: match.index + fullMatch.length
    });
  }
  
  return images;
}

// Helper: Set nested object property by path
function setNestedProperty(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
}

// Helper: Compress image to WebP
async function compressImage(base64Data, mimeType) {
  try {
    // Remove data URL prefix
    const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64String, 'base64');
    
    // Compress using sharp
    const compressedBuffer = await sharp(buffer)
      .resize(MAX_WIDTH, null, { 
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    
    return compressedBuffer;
  } catch (error) {
    console.error('Error compressing image:', error.message);
    throw error;
  }
}

// Helper: Upload to Supabase Storage
async function uploadToSupabase(buffer, filename) {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: 'image/webp',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading to Supabase:', error);
      throw error;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);
    
    return publicUrl;
  } catch (error) {
    console.error('Error in uploadToSupabase:', error);
    throw error;
  }
}

// Helper: Generate filename for storage
function generateFilename(questionId, imagePath, index) {
  const timestamp = Date.now();
  const sanitizedPath = imagePath.replace(/\./g, '-').replace(/[^a-zA-Z0-9-]/g, '');
  return `q${questionId}-${sanitizedPath}-${index}-${timestamp}.webp`;
}

// Helper: Generate filename for text field images
function generateTextFilename(questionId, fieldName, index) {
  const timestamp = Date.now();
  return `q${questionId}-${fieldName}-${index}-${timestamp}.webp`;
}

// Main migration function
async function migrateImages() {
  console.log('Starting image migration...');
  console.log('Bucket:', BUCKET_NAME);
  console.log('Max width:', MAX_WIDTH);
  console.log('WebP quality:', WEBP_QUALITY);
  
  try {
    // 1. Create backup of questions table
    console.log('\n1. Creating backup...');
    const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `questions-backup-${backupTimestamp}.json`;
    
    const { rows: questions } = await pool.query('SELECT id, gallery, "stemImage", "explanationCorrectImage", "explanationWrongImage", "summaryImage", stem, "explanationCorrect", "explanationWrong", "summary", explanation FROM "questions"');
    
    fs.writeFileSync(
      path.join(__dirname, backupFileName),
      JSON.stringify(questions, null, 2)
    );
    console.log(`Backup created: ${backupFileName}`);
    console.log(`Total questions to process: ${questions.length}`);
    
    // 2. Check if bucket exists, create if not
    console.log('\n2. Checking Supabase Storage bucket...');
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log(`Creating bucket: ${BUCKET_NAME}`);
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760 // 10MB limit
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        throw createError;
      }
      console.log('Bucket created successfully');
    } else {
      console.log('Bucket already exists');
    }
    
    // 3. Process each question
    console.log('\n3. Processing questions...');
    let processedCount = 0;
    let imageCount = 0;
    let totalSizeBefore = 0;
    let totalSizeAfter = 0;
    const errors = [];
    
    for (const question of questions) {
      try {
        const questionId = question.id;
        const questionData = {
          gallery: question.gallery ? JSON.parse(question.gallery) : {},
          stemImage: question.stemImage ? JSON.parse(question.stemImage) : {},
          explanationCorrectImage: question.explanationCorrectImage ? JSON.parse(question.explanationCorrectImage) : {},
          explanationWrongImage: question.explanationWrongImage ? JSON.parse(question.explanationWrongImage) : {},
          summaryImage: question.summaryImage ? JSON.parse(question.summaryImage) : {}
        };
        
        // Extract base64 images from JSON fields
        const jsonImages = extractBase64Images(questionData);
        
        // Extract base64 images from text fields
        const textFields = ['stem', 'explanationCorrect', 'explanationWrong', 'summary', 'explanation'];
        const textImages = [];
        
        for (const fieldName of textFields) {
          const textValue = question[fieldName];
          if (textValue) {
            const fieldImages = extractBase64ImagesFromText(textValue, fieldName);
            textImages.push(...fieldImages);
          }
        }
        
        const allImages = [...jsonImages, ...textImages];
        
        if (allImages.length === 0) {
          console.log(`Question ${questionId}: No images found, skipping`);
          continue;
        }
        
        console.log(`Question ${questionId}: Found ${allImages.length} image(s) (${jsonImages.length} JSON, ${textImages.length} text)`);
        
        // Process each image
        const updatedImages = [];
        const textUpdates = {}; // Track text field updates
        
        for (let i = 0; i < allImages.length; i++) {
          const image = allImages[i];
          
          try {
            // Calculate original size
            const originalSize = Math.round(image.data.length * 0.75); // Approximate
            totalSizeBefore += originalSize;
            
            // Compress image
            const compressedBuffer = await compressImage(image.data, image.mimeType);
            const compressedSize = compressedBuffer.length;
            totalSizeAfter += compressedSize;
            
            // Generate filename and upload
            const filename = image.fieldName 
              ? generateTextFilename(questionId, image.fieldName, i)
              : generateFilename(questionId, image.path, i);
            const publicUrl = await uploadToSupabase(compressedBuffer, filename);
            
            // Update either JSON data or text field
            if (image.fieldName) {
              // This is a text field image
              if (!textUpdates[image.fieldName]) {
                textUpdates[image.fieldName] = question[image.fieldName];
              }
              // Replace the full match with the new URL
              textUpdates[image.fieldName] = textUpdates[image.fieldName].replace(
                image.fullMatch,
                `|image:${publicUrl}|`
              );
              const savings = Math.round((1 - compressedSize / originalSize) * 100);
              console.log(`  - ${image.fieldName} [text]: ${originalSize}KB → ${compressedSize}KB (${savings}% savings)`);
            } else {
              // This is a JSON field image
              setNestedProperty(questionData, image.path, publicUrl);
              const savings = Math.round((1 - compressedSize / originalSize) * 100);
              console.log(`  - ${image.path}: ${originalSize}KB → ${compressedSize}KB (${savings}% savings)`);
            }
            
            imageCount++;
            updatedImages.push({
              path: image.path || image.fieldName,
              originalSize,
              compressedSize,
              url: publicUrl,
              type: image.fieldName ? 'text' : 'json'
            });
          } catch (error) {
            console.error(`  - Error processing ${image.path || image.fieldName}:`, error.message);
            errors.push({
              questionId,
              imagePath: image.path || image.fieldName,
              error: error.message
            });
          }
        }
        
        // Update database with new URLs
        if (updatedImages.length > 0) {
          await pool.query(
            `UPDATE "questions" SET 
              gallery = $1,
              "stemImage" = $2,
              "explanationCorrectImage" = $3,
              "explanationWrongImage" = $4,
              "summaryImage" = $5,
              stem = $6,
              "explanationCorrect" = $7,
              "explanationWrong" = $8,
              "summary" = $9,
              explanation = $10
            WHERE id = $11`,
            [
              JSON.stringify(questionData.gallery),
              JSON.stringify(questionData.stemImage),
              JSON.stringify(questionData.explanationCorrectImage),
              JSON.stringify(questionData.explanationWrongImage),
              JSON.stringify(questionData.summaryImage),
              textUpdates.stem || question.stem,
              textUpdates.explanationCorrect || question.explanationCorrect,
              textUpdates.explanationWrong || question.explanationWrong,
              textUpdates.summary || question.summary,
              textUpdates.explanation || question.explanation,
              questionId
            ]
          );
          
          processedCount++;
          console.log(`  ✓ Question ${questionId} updated in database`);
        }
        
      } catch (error) {
        console.error(`Error processing question ${question.id}:`, error.message);
        errors.push({
          questionId: question.id,
          error: error.message
        });
      }
    }
    
    // 4. Summary
    console.log('\n4. Migration Summary:');
    console.log(`Total questions processed: ${processedCount}`);
    console.log(`Total images migrated: ${imageCount}`);
    console.log(`Total size before: ${(totalSizeBefore / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total size after: ${(totalSizeAfter / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total savings: ${((1 - totalSizeAfter / totalSizeBefore) * 100).toFixed(2)}%`);
    
    if (errors.length > 0) {
      console.log(`\nErrors encountered: ${errors.length}`);
      errors.forEach(err => {
        console.log(`  - Question ${err.questionId}${err.imagePath ? ` (${err.imagePath})` : ''}: ${err.error}`);
      });
      
      // Save errors to file
      const errorFileName = `migration-errors-${backupTimestamp}.json`;
      fs.writeFileSync(
        path.join(__dirname, errorFileName),
        JSON.stringify(errors, null, 2)
      );
      console.log(`Errors saved to: ${errorFileName}`);
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log(`⚠️  Review the backup file: ${backupFileName}`);
    console.log('⚠️  Delete backup only after confirming everything works correctly');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Test mode: process single question
async function testSingleQuestion(questionId) {
  console.log(`Testing migration for single question: ${questionId}`);
  
  try {
    const { rows } = await pool.query(
      'SELECT id, gallery, "stemImage", "explanationCorrectImage", "explanationWrongImage", "summaryImage", stem, "explanationCorrect", "explanationWrong", "summary", explanation FROM "questions" WHERE id = $1',
      [questionId]
    );
    
    if (rows.length === 0) {
      console.log(`Question ${questionId} not found`);
      return;
    }
    
    const question = rows[0];
    console.log('Question data:', {
      id: question.id,
      hasGallery: !!question.gallery,
      hasStemImage: !!question.stemImage,
      hasExplanationImages: !!(question.explanationCorrectImage || question.explanationWrongImage),
      hasTextFields: !!(question.stem || question.explanationCorrect || question.explanationWrong || question.summary || question.explanation)
    });
    
    // Run migration for just this question
    await migrateImagesForSingleQuestion(question);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Migration for single question (extracted from main function)
async function migrateImagesForSingleQuestion(question) {
  console.log('Starting single question migration...');
  
  try {
    const questionId = question.id;
    const questionData = {
      gallery: question.gallery ? JSON.parse(question.gallery) : {},
      stemImage: question.stemImage ? JSON.parse(question.stemImage) : {},
      explanationCorrectImage: question.explanationCorrectImage ? JSON.parse(question.explanationCorrectImage) : {},
      explanationWrongImage: question.explanationWrongImage ? JSON.parse(question.explanationWrongImage) : {},
      summaryImage: question.summaryImage ? JSON.parse(question.summaryImage) : {}
    };
    
    // Extract base64 images from JSON fields
    const jsonImages = extractBase64Images(questionData);
    
    // Extract base64 images from text fields
    const textFields = ['stem', 'explanationCorrect', 'explanationWrong', 'summary', 'explanation'];
    const textImages = [];
    
    for (const fieldName of textFields) {
      const textValue = question[fieldName];
      if (textValue) {
        const fieldImages = extractBase64ImagesFromText(textValue, fieldName);
        textImages.push(...fieldImages);
      }
    }
    
    const allImages = [...jsonImages, ...textImages];
    
    if (allImages.length === 0) {
      console.log(`Question ${questionId}: No images found, skipping`);
      return;
    }
    
    console.log(`Question ${questionId}: Found ${allImages.length} image(s) (${jsonImages.length} JSON, ${textImages.length} text)`);
    
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log(`Creating bucket: ${BUCKET_NAME}`);
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        throw createError;
      }
    }
    
    // Process each image
    let totalSizeBefore = 0;
    let totalSizeAfter = 0;
    const textUpdates = {};
    
    for (let i = 0; i < allImages.length; i++) {
      const image = allImages[i];
      
      try {
        const originalSize = Math.round(image.data.length * 0.75);
        totalSizeBefore += originalSize;
        
        const compressedBuffer = await compressImage(image.data, image.mimeType);
        const compressedSize = compressedBuffer.length;
        totalSizeAfter += compressedSize;
        
        const filename = image.fieldName 
          ? generateTextFilename(questionId, image.fieldName, i)
          : generateFilename(questionId, image.path, i);
        const publicUrl = await uploadToSupabase(compressedBuffer, filename);
        
        if (image.fieldName) {
          if (!textUpdates[image.fieldName]) {
            textUpdates[image.fieldName] = question[image.fieldName];
          }
          textUpdates[image.fieldName] = textUpdates[image.fieldName].replace(
            image.fullMatch,
            `|image:${publicUrl}|`
          );
          const savings = Math.round((1 - compressedSize / originalSize) * 100);
          console.log(`  - ${image.fieldName} [text]: ${originalSize}KB → ${compressedSize}KB (${savings}% savings)`);
        } else {
          setNestedProperty(questionData, image.path, publicUrl);
          const savings = Math.round((1 - compressedSize / originalSize) * 100);
          console.log(`  - ${image.path}: ${originalSize}KB → ${compressedSize}KB (${savings}% savings)`);
        }
        
      } catch (error) {
        console.error(`  - Error processing ${image.path || image.fieldName}:`, error.message);
      }
    }
    
    // Update database
    await pool.query(
      `UPDATE "questions" SET 
        gallery = $1,
        "stemImage" = $2,
        "explanationCorrectImage" = $3,
        "explanationWrongImage" = $4,
        "summaryImage" = $5,
        stem = $6,
        "explanationCorrect" = $7,
        "explanationWrong" = $8,
        "summary" = $9,
        explanation = $10
      WHERE id = $11`,
      [
        JSON.stringify(questionData.gallery),
        JSON.stringify(questionData.stemImage),
        JSON.stringify(questionData.explanationCorrectImage),
        JSON.stringify(questionData.explanationWrongImage),
        JSON.stringify(questionData.summaryImage),
        textUpdates.stem || question.stem,
        textUpdates.explanationCorrect || question.explanationCorrect,
        textUpdates.explanationWrong || question.explanationWrong,
        textUpdates.summary || question.summary,
        textUpdates.explanation || question.explanation,
        questionId
      ]
    );
    
    console.log(`✓ Question ${questionId} updated in database`);
    console.log(`Total size reduction: ${((1 - totalSizeAfter / totalSizeBefore) * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error('Single question migration failed:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === '--test' && args[1]) {
    const testId = args[1];
    testSingleQuestion(testId);
  } else {
    migrateImages();
  }
}

module.exports = { migrateImages, testSingleQuestion, migrateImagesForSingleQuestion };