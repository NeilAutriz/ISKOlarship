// Quick verification of the specific admin user mentioned
require('dotenv').config();
const mongoose = require('mongoose');

async function verifySpecificAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    const admin = await usersCollection.findOne({ 
      email: 'admintestcreateprof@up.edu.ph' 
    });
    
    console.log('Admin user: admintestcreateprof@up.edu.ph\n');
    console.log('Has employeeIdDocument:', !!admin.adminProfile?.employeeIdDocument);
    console.log('Has documents array:', !!admin.adminProfile?.documents);
    console.log('Documents count:', admin.adminProfile?.documents?.length || 0);
    
    if (admin.adminProfile?.documents?.length > 0) {
      console.log('\nDocuments:');
      admin.adminProfile.documents.forEach((doc, idx) => {
        console.log(`\n  ${idx + 1}. ${doc.name || doc.documentType}`);
        console.log(`     File: ${doc.fileName}`);
        console.log(`     Type: ${doc.documentType}`);
        console.log(`     Path: ${doc.filePath}`);
        console.log(`     Size: ${(doc.fileSize / 1024).toFixed(2)} KB`);
      });
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifySpecificAdmin();
