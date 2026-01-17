// =============================================================================
// Test Document Upload - Check if documents are being saved
// =============================================================================

require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models');

const testDocumentUpload = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check the user you just created
    const email = 'studentdoc@up.edu.ph';
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log('📋 User Found:', email);
    console.log('Role:', user.role);
    console.log('Profile Completed:', user.studentProfile?.profileCompleted);
    
    console.log('\n📄 DOCUMENT CHECK:');
    console.log('Has documents field?', user.studentProfile?.documents !== undefined);
    console.log('Documents is array?', Array.isArray(user.studentProfile?.documents));
    console.log('Documents count:', user.studentProfile?.documents?.length || 0);
    
    if (user.studentProfile?.documents && user.studentProfile.documents.length > 0) {
      console.log('\n✅ Documents found in database:');
      user.studentProfile.documents.forEach((doc, idx) => {
        console.log(`\nDocument ${idx + 1}:`);
        console.log('  Name:', doc.name);
        console.log('  Type:', doc.documentType);
        console.log('  File Name:', doc.fileName);
        console.log('  File Size:', doc.fileSize, 'bytes');
        console.log('  MIME Type:', doc.mimeType);
        console.log('  Has URL/Data:', !!doc.url);
        console.log('  URL Length:', doc.url?.length || 0, 'characters');
        console.log('  Uploaded At:', doc.uploadedAt);
        
        // Show first 100 chars of base64 data
        if (doc.url) {
          console.log('  URL Preview:', doc.url.substring(0, 100) + '...');
        }
      });
    } else {
      console.log('\n❌ NO DOCUMENTS FOUND IN DATABASE!');
      console.log('\nThis means:');
      console.log('1. Documents were not sent from frontend, OR');
      console.log('2. Backend did not process them, OR');
      console.log('3. Documents were not saved to database');
      console.log('\nCheck the console logs when creating the user to debug.');
    }

    console.log('\n📊 Full Student Profile (excluding long fields):');
    const profile = { ...user.studentProfile.toObject() };
    if (profile.documents) {
      profile.documents = profile.documents.map(d => ({
        name: d.name,
        type: d.documentType,
        fileName: d.fileName,
        fileSize: d.fileSize,
        hasData: !!d.url,
        dataLength: d.url?.length || 0
      }));
    }
    console.log(JSON.stringify(profile, null, 2));

    await mongoose.connection.close();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testDocumentUpload();
