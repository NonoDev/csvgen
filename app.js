const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { sequelize, Item } = require('./models');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(session({
    secret: 'tu_clave_secreta',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1 * 60 * 60 * 1000 }
}));

const user = {
    username: 'admin',
    passwordHash: null
};

// Contraseña y registro
const plainPassword = '12Admin@2025';
bcrypt.hash(plainPassword, 10, (err, hash) => {
    if (err) throw err;
    user.passwordHash = hash;
    console.log('Usuario registrado con hash:', hash);
});

// Ruta para obtener los elementos con paginación
app.get('/admin/items', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    try {
        const { count, rows } = await Item.findAndCountAll({
            limit,
            offset,
            order: [['fecha', 'DESC']]
        });

        res.json({
            success: true,
            items: rows,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Función para la sesión del administrador
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    } else {
        res.redirect('/login');
    }
}

// Ruta para la vista index
app.get('/', (req, res) => {
    res.render('index', { csv: '', fecha: '', expediente: '' });
});

// Ruta para la vista en la que se genera el CSV
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

// Ruta para la vista de administración
app.get('/admin', isAuthenticated, async (req, res) => {
    try {
        const items = await Item.findAll();
        res.render('admin', { items });
    } catch (error) {
        console.error('Error al recuperar ítems:', error);
        res.status(500).send('Error al recuperar ítems');
    }
});

// Ruta para editar los campos del listado de administración
app.put('/admin/edit/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { csv, fecha, expediente } = req.body;
        const item = await Item.findByPk(id);

        if (!item) {
            return res.status(404).json({ success: false, message: 'Ítem no encontrado' });
        }

        item.csv = csv;
        item.fecha = fecha;
        item.expediente = expediente;
        await item.save();

        res.json({ success: true, message: 'Ítem actualizado correctamente' });
    } catch (error) {
        console.error('Error al editar ítem:', error);
        res.status(500).json({ success: false, message: 'Error al editar ítem' });
    }
});

// Ruta para eliminar las filas en el listado de administración
app.delete('/admin/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Item.findByPk(id);

        if (!item) {
            return res.status(404).json({ success: false, message: 'Ítem no encontrado' });
        }

        await item.destroy();
        res.json({ success: true, message: 'Ítem eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar ítem:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar ítem' });
    }
});

// Ruta para el get de login
app.get('/login', (req, res) => {
    res.render('login');
});

// Ruta para el login del admin
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

// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/admin');
        }
        res.redirect('/');
    });
});

// Ruta de verificación
app.get('/verify', (req, res) => {
    res.render('verify');
});

// Ruta para la comprobación del formulario de verificación
app.post('/verify', async (req, res) => {
    try {
        const { csvCode, fecha, expediente } = req.body;
        console.log('Verificando datos:', { csvCode, fecha, expediente });

        // Buscar el registro en la base de datos
        const item = await Item.findOne({ where: { csv: csvCode, fecha, expediente } });

        if (item) {
            res.json({ valid: true });
        } else {
            res.json({ valid: false });
        }
    } catch (error) {
        console.error('Error al verificar:', error);
        res.status(500).json({ valid: false, error: 'Error al verificar el código' });
    }
});

// Conexión server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
