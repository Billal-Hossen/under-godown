const mongoose = require('mongoose');
require('dotenv').config();
// const User = require('../../models/User');
const usersData = require('./users.json');
const connectDB = require('../dbConnection');
const { UserModel } = require('../../data/models/user');
const { RoleModel } = require('../../data/models/role');
const { PermissionModel } = require('../../data/models/permission');
const { MenuModel } = require('../../data/models/menu');
require('colors');

async function seedDatabase() {

        try {
        await   connectDB()

        // Clear existing data (optional)
        await Promise.all([
            MenuModel.deleteMany(),
            PermissionModel.deleteMany(),
            RoleModel.deleteMany(),
            UserModel.deleteMany(),
        ]);
        console.log('🧹 Cleared existing data');

        // --------------------------
        // Step 1: Create Menus
        // --------------------------
        const dashboardMenu = await MenuModel.create({
            title: 'Dashboard',
            description: 'System overview',
            path: '/dashboard',
            icon: 'dashboard',
            order: 0,
        });

        const productsMenu = await MenuModel.create({
            title: 'Products',
            description: 'Manage products',
            path: '/products',
            icon: 'box',
            order: 1,
        });

        const productSubmenus = await MenuModel.insertMany([
            {
                title: 'Product List',
                path: '/products/list',
                icon: 'list',
                parentId: productsMenu._id,
                order: 0,
            },
            {
                title: 'Add Product',
                path: '/products/add',
                icon: 'plus',
                parentId: productsMenu._id,
                order: 1,
            },
            {
                title: 'Categories',
                path: '/products/categories',
                icon: 'tags',
                parentId: productsMenu._id,
                order: 2,
            },
            {
                title: 'Brands',
                path: '/products/brands',
                icon: 'bookmark',
                parentId: productsMenu._id,
                order: 3,
            },
        ]);

        const ordersMenu = await MenuModel.create({
            title: 'Orders',
            description: 'Manage orders',
            path: '/orders',
            icon: 'shopping-cart',
            order: 2,
        });

        const orderSubmenus = await MenuModel.insertMany([
            {
                title: 'Order List',
                path: '/orders/list',
                icon: 'list',
                parentId: ordersMenu._id,
                order: 0,
            },
            {
                title: 'Pending Orders',
                path: '/orders/pending',
                icon: 'clock',
                parentId: ordersMenu._id,
                order: 1,
            },
            {
                title: 'Completed Orders',
                path: '/orders/completed',
                icon: 'check',
                parentId: ordersMenu._id,
                order: 2,
            },
            {
                title: 'Cancelled Orders',
                path: '/orders/cancelled',
                icon: 'x',
                parentId: ordersMenu._id,
                order: 3,
            },
        ]);

        const allMenus = [
            dashboardMenu,
            productsMenu,
            ordersMenu,
            ...productSubmenus,
            ...orderSubmenus,
        ];

        console.log(`📂 Seeded ${allMenus.length} menus`.green);

        // --------------------------
        // Step 2: Create Permissions
        // --------------------------
        const permissions = await PermissionModel.insertMany([
            // General
            { title: 'View Dashboard', slug: 'view-dashboard', parentTitle: 'Dashboard' },

            // Products
            { title: 'View Products', slug: 'view-products', parentTitle: 'Products' },
            { title: 'Add Product', slug: 'add-product', parentTitle: 'Products' },
            { title: 'Edit Product', slug: 'edit-product', parentTitle: 'Products' },
            { title: 'Delete Product', slug: 'delete-product', parentTitle: 'Products' },
            { title: 'Manage Categories', slug: 'manage-categories', parentTitle: 'Products' },
            { title: 'Manage Brands', slug: 'manage-brands', parentTitle: 'Products' },

            // Orders
            { title: 'View Orders', slug: 'view-orders', parentTitle: 'Orders' },
            { title: 'Update Order Status', slug: 'update-order-status', parentTitle: 'Orders' },
            { title: 'Cancel Orders', slug: 'cancel-orders', parentTitle: 'Orders' },
        ]);

        console.log(`✅ Seeded ${permissions.length} permissions`);

        // --------------------------
        // Step 3: Create Admin Role
        // --------------------------
        const adminRole = await RoleModel.create({
            roleName: 'admin',
            isPredefined: true,
            permissionIds: permissions.map(p => p._id),
            menuIds: allMenus.map(m => m._id),
        });

        const userRole = await RoleModel.create({
            roleName: 'user',
            isPredefined: true,
        })
        const users = [
            { "userName":"Admin","email": "admin@gmail.com", "password": "$2a$12$NhQZqx/5SLl15gpsArDEQ.sRFy6kMVk6o67uhKuqJ7q5G3vFdNnFO", "userType": "ADMIN", "isActive": true, "userStatus": "ACTIVE", "role": new mongoose.Types.ObjectId(adminRole._id) },
            { "userName": "Dipu", "email": "dipu@gmail.com", "password": "$2a$12$NhQZqx/5SLl15gpsArDEQ.sRFy6kMVk6o67uhKuqJ7q5G3vFdNnFO", "userType": "USER", "isActive": true, "userStatus": "ACTIVE", "role": new mongoose.Types.ObjectId(userRole._id)    }
        ]
        await UserModel.insertMany(users);



        console.log(`🛡️ Created Admin Role with ${permissions.length} permissions and ${allMenus.length} menus`);
        console.log("Database seeding completed and connection closed".yellow.underline);
        process.exit(0);
    } catch (err) {
         console.error("❌ Error connecting to MongoDB or seeding data:".red, err);
        process.exit(1);
    }
}

async function createUsers() {
    try {
        await User.deleteMany({});
        await User.insertMany(usersData);
        console.log("Users data seeded successfully".green);
    } catch (error) {
        console.error("Error seeding users data:".red, error);
    }

}

seedDatabase();