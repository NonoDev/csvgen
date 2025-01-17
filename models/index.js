const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Configurar Sequelize para usar SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'database.sqlite')
});

// Definir el modelo de Item
const Item = sequelize.define('Item', {
    csv: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fecha: {
        type: DataTypes.STRING,
        allowNull: false
    },
    expediente: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

// Sincronizar el modelo con la base de datos
sequelize.sync();

module.exports = { sequelize, Item };
