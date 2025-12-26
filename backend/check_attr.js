const {sequelize} = require('./config/db');
const facilityService = require('./utils/facilityEquipmentEavService');
const { v4: uuidv4 } = require('uuid');

async function run() {
  const testFacilityId = uuidv4();
  
  // Create test facility (using correct enum value)
  await sequelize.query(
    `INSERT INTO facilities (id, name, code, type, capacity, status, "isActive", "equipmentList", "createdAt", "updatedAt")
     VALUES (:id, 'Debug Facility', 'DBG01', 'Laboratory', 10, 'Active', true, '[]', NOW(), NOW())`,
    { replacements: { id: testFacilityId } }
  );
  
  // Add equipment with integer quantity
  const added = await facilityService.addFacilityEquipment(testFacilityId, {
    name: 'Test Item',
    quantity: 10,
    condition: 'Good'
  });
  console.log('Added:', added);
  
  // Read back from EAV
  const equipment = await facilityService.getEquipmentFromEav(testFacilityId);
  console.log('Read back:', equipment);
  console.log('Quantity type:', typeof equipment[0]?.quantity);
  console.log('Quantity value:', equipment[0]?.quantity);
  
  // Check raw value in database
  const raw = await sequelize.query(
    `SELECT av."valueInteger", av."valueString", av."valueType", ad.name as attr_name
     FROM attribute_values av
     JOIN attribute_definitions ad ON av."attributeId" = ad.id
     WHERE av."entityId" = :facilityId AND ad.name = 'equipment_quantity'`,
    { replacements: { facilityId: testFacilityId }, type: sequelize.QueryTypes.SELECT }
  );
  console.log('Raw DB value:', raw);
  
  // Cleanup
  await sequelize.query(`DELETE FROM attribute_values WHERE "entityId" = :id`, { replacements: { id: testFacilityId } });
  await sequelize.query(`DELETE FROM facilities WHERE id = :id`, { replacements: { id: testFacilityId } });
  
  await sequelize.close();
}

run().catch(e => { console.error(e); process.exit(1); });
