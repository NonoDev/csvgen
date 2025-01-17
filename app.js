const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { Sequelize, DataTypes } = require('sequelize');
const app = express();

// Configuración de vistas y middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(
    session({
        secret: 'tu_clave_secreta',
        resave: false,
        saveUninitialized: true,
        cookie: { maxAge: 1 * 60 * 60 * 1000 }, // 1 hora
    })
);

// Configuración de la base de datos SQLite en /tmp
const originalDbPath = path.join(__dirname, 'database.sqlite');
const projectDir = __dirname;
const tempDbPath = path.join(projectDir, 'tmp', 'database.sqlite');

// Copiar la base de datos al directorio temporal si no existe
if (!fs.existsSync(tempDbPath)) {
    fs.copyFileSync(originalDbPath, tempDbPath);
    console.log('Base de datos copiada a /tmp');
}

// Conexión a la base de datos
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: tempDbPath,
    logging: false,
});

// Definición del modelo `Item`
const Item = sequelize.define('Item', {
    csv: { type: DataTypes.STRING, allowNull: false },
    fecha: { type: DataTypes.STRING, allowNull: false },
    expediente: { type: DataTypes.STRING, allowNull: false },
});

// Usuario admin predefinido
const user = {
    username: 'admin',
    passwordHash: null,
};

// Contraseña y registro
const plainPassword = '12Admin@2025';
bcrypt.hash(plainPassword, 10, (err, hash) => {
    if (err) throw err;
    user.passwordHash = hash;
    console.log('Usuario registrado con hash:', hash);
});

// Rutas de la aplicación
app.get('/', (req, res) => {
    res.render('index', { csv: '', fecha: '', expediente: '' });
});

app.post('/generate', async (req, res) => {
    try {
        const { csv, fecha, expediente } = req.body;
        await Item.create({ csv, fecha, expediente });
        res.json({ success: true });
    } catch (error) {
        console.error('Error al crear el ítem:', error);
        res.status(500).json({ success: false, error: 'Error al crear el ítem' });
    }
});

app.get('/admin', isAuthenticated, async (req, res) => {
    try {
        const items = await Item.findAll();
        res.render('admin', { items });
    } catch (error) {
        console.error('Error al recuperar ítems:', error);
        res.status(500).send('Error al recuperar ítems');
    }
});

// Resto de las rutas (admin, login, verify, etc.)
app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === user.username) {
        bcrypt.compare(password, user.passwordHash, (err, result) => {
            if (result) {
                req.session.userId = user.username;
                res.redirect('/admin');
            } else {
                res.send('Contraseña incorrecta');
            }
        });
    } else {
        res.send('Usuario no encontrado');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.redirect('/admin');
        res.redirect('/');
    });
});

function isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    res.redirect('/login');
}

// Conexión del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    try {
        await sequelize.authenticate();
        console.log('Conexión con la base de datos establecida.');
        await sequelize.sync(); // Sincroniza el modelo con la base de datos
        console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    } catch (error) {
        console.error('Error al conectar con la base de datos:', error);
    }
});
