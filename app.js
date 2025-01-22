const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

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

// Configuración de la base de datos MySQL
const dbConfig = {
    host: process.env.DB_HOST || 'qaln280.invemtec.es', // Cambia esto por tu host de MySQL
    user: process.env.DB_USER || 'qaln280', // Cambia esto por tu usuario de MySQL
    password: process.env.DB_PASSWORD || '123Lorryges', // Cambia esto por tu contraseña de MySQL
    database: process.env.DB_NAME || 'qaln280' // Cambia esto por tu base de datos de MySQL
};

let connection;

async function connectToDatabase() {
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Conectado a la base de datos MySQL');

        // Crear tabla si no existe
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                csv TEXT NOT NULL,
                fecha TEXT NOT NULL,
                expediente TEXT NOT NULL,
                qr_image BLOB
            )
        `);
    } catch (error) {
        console.error('Error al conectar a la base de datos MySQL:', error);
        setTimeout(connectToDatabase, 5000); // Reintentar la conexión después de 5 segundos
    }
}

connectToDatabase().catch(err => {
    console.error('Error al conectar a la base de datos MySQL:', err);
});

// Usuario admin predefinido
const user = {
    username: 'admin',
    passwordHash: null,
};

// Contraseña y registro
const plainPassword = '12Admin@2025';
bcrypt.hash(plainPassword, 10, async (err, hash) => {
    if (err) throw err;
    user.passwordHash = hash;
    console.log('Usuario registrado con hash:', hash);
});

// Middleware para verificar la conexión a la base de datos
app.use(async (req, res, next) => {
    if (!connection) {
        try {
            await connectToDatabase();
        } catch (error) {
            return res.status(500).json({ success: false, error: 'No hay conexión a la base de datos' });
        }
    }
    next();
});

// Rutas de la aplicación
app.get('/', isAuthenticated, (req, res) => {
    res.render('index', { csv: '', fecha: '', expediente: '' });
});

app.post('/generate', isAuthenticated, async (req, res) => {
    const { csv, fecha, expediente, qr_image } = req.body;
    const qrImageBuffer = Buffer.from(qr_image.split(',')[1], 'base64'); // Convertir la imagen base64 a un buffer

    try {
        await connection.execute('INSERT INTO items (csv, fecha, expediente, qr_image) VALUES (?, ?, ?, ?)', [csv, fecha, expediente, qrImageBuffer]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error al crear el ítem:', error);
        res.status(500).json({ success: false, error: 'Error al crear el ítem' });
    }
});

// Ruta para comprobar expedientes existentes
app.post('/check-expediente', isAuthenticated, async (req, res) => {
    const { expediente } = req.body;
    try {
        const [rows] = await connection.execute('SELECT * FROM items WHERE expediente = ?', [expediente]);
        if (rows.length > 0) {
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

app.get('/admin/items', isAuthenticated, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Número de elementos por página
    const offset = (page - 1) * limit;
    const query = req.query.query ? `%${req.query.query}%` : '%';
    const orderColumn = req.query.orderColumn || 'id';
    const orderDirection = req.query.orderDirection || 'desc';

    try {
        const [totalItemsResult] = await connection.execute('SELECT COUNT(*) AS count FROM items WHERE expediente LIKE ?', [query]);
        const totalItems = totalItemsResult[0].count;
        const totalPages = Math.ceil(totalItems / limit);

        const [items] = await connection.execute(`SELECT * FROM items WHERE expediente LIKE ? ORDER BY ${orderColumn} ${orderDirection} LIMIT ? OFFSET ?`, [query, limit.toString(), offset.toString()]);

        // Convertir el buffer de la imagen QR a base64
        items.forEach(item => {
            if (item.qr_image) {
                item.qr_image = item.qr_image.toString('base64');
            }
        });

        res.json({
            success: true,
            items,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.error('Error al obtener los elementos:', error);
        res.status(500).json({ success: false, error: 'Error al obtener los elementos' });
    }
});

app.put('/admin/edit/:id', isAuthenticated, async (req, res) => {
    const id = req.params.id;
    const { csv, fecha, expediente } = req.body;

    try {
        await connection.execute('UPDATE items SET csv = ?, fecha = ?, expediente = ? WHERE id = ?', [csv, fecha, expediente, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error al editar el ítem:', error);
        res.status(500).json({ success: false, error: 'Error al editar el ítem' });
    }
});

app.delete('/admin/delete/:id', isAuthenticated, async (req, res) => {
    const id = req.params.id;
    try {
        const [result] = await connection.execute('DELETE FROM items WHERE id = ?', [id]);
        if (result.affectedRows > 0) {
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
    const redirectTo = req.body.redirectTo || '/admin';
    if (username === user.username) {
        bcrypt.compare(password, user.passwordHash, (err, result) => {
            if (result) {
                req.session.userId = user.username;
                res.redirect(redirectTo);
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
app.post('/verify', async (req, res) => {
    try {
        const { csvCode, fecha, expediente } = req.body;
        console.log('Verificando datos:', { csvCode, fecha, expediente });

        // Buscar el registro en la base de datos
        const [rows] = await connection.execute('SELECT * FROM items WHERE csv = ? AND fecha = ? AND expediente = ?', [csvCode, fecha, expediente]);

        if (rows.length > 0) {
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
    res.redirect(`/login?redirectTo=${encodeURIComponent(req.originalUrl)}`);
}

// Conexión del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});