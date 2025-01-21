const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs');
const betterSqlite3 = require('better-sqlite3');

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

// Configuración de la base de datos SQLite con better-sqlite3
//const dbPath = path.join('/tmp', 'database.sqlite');
const dbPath = path.join(__dirname, 'tmp', 'database.sqlite');
const db = betterSqlite3(dbPath, { verbose: console.log });

// Crear tabla si no existe
db.prepare(`
    CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        csv TEXT NOT NULL,
        fecha TEXT NOT NULL,
        expediente TEXT NOT NULL
    )
`).run();

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
app.get('/', isAuthenticated, (req, res) => {
    res.render('index', { csv: '', fecha: '', expediente: '' });
});

app.post('/generate', isAuthenticated, (req, res) => {
    const { csv, fecha, expediente } = req.body;
    const stmt = db.prepare('INSERT INTO items (csv, fecha, expediente) VALUES (?, ?, ?)');
    try {
        stmt.run(csv, fecha, expediente);
        res.json({ success: true });
    } catch (error) {
        console.error('Error al crear el ítem:', error);
        res.status(500).json({ success: false, error: 'Error al crear el ítem' });
    }
});
// Ruta para comprobar expedientes existentes
app.post('/check-expediente', isAuthenticated, (req, res) => {
    const { expediente } = req.body;
    try {
        const item = db.prepare('SELECT * FROM items WHERE expediente = ?').get(expediente);
        if (item) {
            res.json({ exists: true });
        } else {
            res.json({ exists: false });
        }
    } catch (error) {
        console.error('Error al comprobar el expediente:', error);
        res.status(500).json({ exists: false, error: 'Error al comprobar el expediente' });
    }
});

app.get('/admin', isAuthenticated, (req, res) => {
    res.render('admin');
});

app.get('/admin/items', isAuthenticated, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Número de elementos por página
    const offset = (page - 1) * limit;
    const query = req.query.query ? `%${req.query.query}%` : '%';
    const orderColumn = req.query.orderColumn || 'id';
    const orderDirection = req.query.orderDirection || 'desc';

    const totalItems = db.prepare('SELECT COUNT(*) AS count FROM items WHERE expediente LIKE ?').get(query).count;
    const totalPages = Math.ceil(totalItems / limit);

    const items = db.prepare(`SELECT * FROM items WHERE expediente LIKE ? ORDER BY ${orderColumn} ${orderDirection} LIMIT ? OFFSET ?`).all(query, limit, offset);

    res.json({
        success: true,
        items,
        totalPages,
        currentPage: page
    });
});

app.put('/admin/edit/:id', isAuthenticated, (req, res) => {
    const id = req.params.id;
    const { csv, fecha, expediente } = req.body;
    try {
        const stmt = db.prepare('UPDATE items SET csv = ?, fecha = ?, expediente = ? WHERE id = ?');
        const result = stmt.run(csv, fecha, expediente, id);
        if (result.changes > 0) {
            res.json({ success: true });
        } else {
            res.json({ success: false, error: 'Elemento no encontrado' });
        }
    } catch (error) {
        console.error('Error al editar el ítem:', error);
        res.status(500).json({ success: false, error: 'Error al editar el ítem' });
    }
});

app.delete('/admin/delete/:id', isAuthenticated, (req, res) => {
    const id = req.params.id;
    try {
        const stmt = db.prepare('DELETE FROM items WHERE id = ?');
        const result = stmt.run(id);
        if (result.changes > 0) {
            res.json({ success: true });
        } else {
            res.json({ success: false, error: 'Elemento no encontrado' });
        }
    } catch (error) {
        console.error('Error al eliminar el ítem:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar el ítem' });
    }
});

app.get('/login', (req, res) => {
    res.render('login', { redirectTo: req.query.redirectTo || '/' });
});
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
// Ruta de verificación
app.get('/verify', (req, res) => {
    const { csv, fecha, expediente } = req.query;
    res.render('verify', { csv, fecha, expediente });
});

// Ruta para la comprobación del formulario de verificación
app.post('/verify', (req, res) => {
    try {
        const { csvCode, fecha, expediente } = req.body;
        console.log('Verificando datos:', { csvCode, fecha, expediente });

        // Buscar el registro en la base de datos
        const item = db.prepare('SELECT * FROM items WHERE csv = ? AND fecha = ? AND expediente = ?').get(csvCode, fecha, expediente);

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

function isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    res.redirect('/login');
}

// Conexión del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});