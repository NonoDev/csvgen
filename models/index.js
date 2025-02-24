const { Sequelize, DataTypes } = require('sequelize');
const betterSqlite3 = require('better-sqlite3');
const path = require('path');

// Configuración de Sequelize para usar SQLite con better-sqlite3
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),  // Ruta a la base de datos en el directorio tmp
    dialectModule: betterSqlite3   // Usar better-sqlite3 en lugar de sqlite3
});

// Definición del modelo `Item`
const Item = sequelize.define('Item', {
    csv: { type: DataTypes.STRING, allowNull: false },
    fecha: { type: DataTypes.STRING, allowNull: false },
    expediente: { type: DataTypes.STRING, allowNull: false },
    matricula: { type: DataTypes.STRING, allowNull: false },
}, {
    timestamps: false,  // Desactiva las marcas de tiempo automáticas
});


// Sincronizar el modelo con la base de datos
sequelize.sync({ alter: true })
    .then(() => console.log('Modelo sincronizado con la base de datos'))
    .catch(error => console.error('Error al sincronizar el modelo:', error));

module.exports = { sequelize, Item };
