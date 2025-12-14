const { User, Role } = require('./models');
const { connectDB } = require('./config/db');

const checkAdvisor = async () => {
    try {
        await connectDB();

        const role = await Role.findOne({ where: { name: 'advisor' } });
        console.log('Advisor Role:', role ? role.toJSON() : 'Not Found');

        if (role) {
            const user = await User.findOne({ where: { email: 'advisor@example.com' } });
            console.log('Advisor User:', user ? user.toJSON() : 'Not Found');
        }

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkAdvisor();
