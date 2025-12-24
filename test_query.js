const { Asset, AssetAllocationLog, User, Department } = require('./backend/models');

const testQuery = async () => {
    try {
        const assets = await Asset.findAll({ limit: 1 });
        if (assets.length === 0) {
            console.log("No assets found");
            return;
        }
        const id = assets[0].id;
        console.log(`Testing getAssetById for ID: ${id}`);

        const asset = await Asset.findByPk(id, {
            include: [
                { model: User, as: 'currentHolder', attributes: ['id', 'fullName', 'email'] },
                { model: Department, as: 'assignedDepartment', attributes: ['id', 'name', 'code'] },
                {
                    model: AssetAllocationLog,
                    as: 'allocationHistory',
                    include: [
                        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
                        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
                        { model: User, as: 'performedBy', attributes: ['id', 'fullName', 'email'] }
                    ],
                }
            ],
        });

        console.log("Success! Asset loaded:", asset.assetName);
        process.exit(0);
    } catch (error) {
        console.error("Query Failed:", error);
        process.exit(1);
    }
}

testQuery();
