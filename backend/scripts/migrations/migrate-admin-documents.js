// =============================================================================
// Migration Script: Move employeeIdDocument to documents array
// This script moves the employeeIdDocument field to documents array for all admins
// =============================================================================

require('dotenv').config();
const mongoose = require('mongoose');

async function migrateAdminDocuments() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Use raw MongoDB driver for direct database operations
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    console.log('📋 Finding admin users with employeeIdDocument...\n');
    
    const adminsWithEmployeeId = await usersCollection.find({
      role: 'admin',
      'adminProfile.employeeIdDocument': { $exists: true }
    }).toArray();

    console.log(`Found ${adminsWithEmployeeId.length} admin(s) with employeeIdDocument field\n`);

    if (adminsWithEmployeeId.length === 0) {
      console.log('✅ No migration needed. All admins are already using documents array.');
      await mongoose.connection.close();
      return;
    }

    let migratedCount = 0;
    let removedEmptyCount = 0;

    for (const admin of adminsWithEmployeeId) {
      console.log(`📧 Processing: ${admin.email}`);
      
      const employeeIdDoc = admin.adminProfile.employeeIdDocument;
      
      if (!employeeIdDoc || !employeeIdDoc.fileName) {
        console.log('   ℹ️  Empty employeeIdDocument, removing field...');
        
        // Just remove the empty employeeIdDocument field
        await usersCollection.updateOne(
          { _id: admin._id },
          { $unset: { 'adminProfile.employeeIdDocument': "" } }
        );
        
        removedEmptyCount++;
        console.log('   ✅ Removed empty field\n');
        continue;
      }

      console.log(`   📄 Moving document: ${employeeIdDoc.fileName}`);

      // Initialize documents array if it doesn't exist
      let documents = admin.adminProfile.documents || [];

      // Check if document already exists in array
      const alreadyExists = documents.some(doc => 
        doc.fileName === employeeIdDoc.fileName && 
        doc.filePath === employeeIdDoc.filePath
      );

      if (alreadyExists) {
        console.log('   ℹ️  Document already in documents array, just removing employeeIdDocument field');
      } else {
        // Add employeeIdDocument to documents array
        const newDoc = {
          name: 'Employee ID',
          documentType: 'employee_id',
          fileName: employeeIdDoc.fileName,
          filePath: employeeIdDoc.filePath,
          fileSize: employeeIdDoc.fileSize || 0,
          mimeType: employeeIdDoc.mimeType || 'application/pdf',
          uploadedAt: employeeIdDoc.uploadedAt || new Date()
        };

        documents.push(newDoc);
        console.log('   ✅ Added to documents array');
      }

      // Update the admin: add to documents array and remove employeeIdDocument
      await usersCollection.updateOne(
        { _id: admin._id },
        {
          $set: { 'adminProfile.documents': documents },
          $unset: { 'adminProfile.employeeIdDocument': "" }
        }
      );

      migratedCount++;
      console.log('   ✅ Migration complete\n');
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   - Migrated ${migratedCount} admin(s) with documents`);
    console.log(`   - Removed ${removedEmptyCount} empty employeeIdDocument field(s)\n`);

    // Verify migration
    console.log('🔍 Verifying migration:\n');
    const verifyAdmins = await usersCollection.find({ role: 'admin' }).toArray();
    
    for (const admin of verifyAdmins) {
      console.log(`📧 ${admin.email}`);
      console.log(`   Has employeeIdDocument: ${!!admin.adminProfile?.employeeIdDocument}`);
      console.log(`   Documents count: ${admin.adminProfile?.documents?.length || 0}`);
      if (admin.adminProfile?.documents?.length > 0) {
        console.log(`   Document types: ${admin.adminProfile.documents.map(d => d.documentType).join(', ')}`);
      }
      console.log('');
    }

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

console.log('🔄 Admin Document Migration Script');
console.log('===================================\n');
migrateAdminDocuments();
