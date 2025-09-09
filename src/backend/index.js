var PORT = 3000;

var express = require('express')
var cors = require('cors')
const jwt = require('jsonwebtoken')

var app = express();
const corsOptions = {
    origin: '*',
    credentials: true
}

const YOUR_SECRET_KEY = 'mi_llave_secreta'

// Middleware
app.use(express.json()); 
app.use(cors(corsOptions))

// Middleware de autenticación
var authenticator = function (req, res, next) {
    let autHeader = (req.headers.authorization || '')
    if (autHeader.startsWith('Bearer ')) {
        token = autHeader.split(' ')[1]
    } else {
        return res.status(401).send({ message: 'Se requiere un token de tipo Bearer' })
    }
    jwt.verify(token, YOUR_SECRET_KEY, function(err) {
      if(err) {
        return res.status(403).send({ message: 'Token inválido' })
      }
    })
    next()
}

// Endpoint básico de prueba
app.get('/', function(req, res) {
    res.send({mensaje: 'API funcionando correctamente'}).status(200)
})

// Login básico (manteniendo el original para testing)
app.post('/login', (req, res) => {
    console.log('🔐 Intento de login:', req.body?.username)
    
    if (!req.body) {
        return res.status(400).send({
            errorMessage: 'Se requieren datos para el login'
        });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send({
            errorMessage: 'Usuario y contraseña son requeridos'
        });
    }

    // Login de prueba (temporal)
    if (username === 'test' && password === '1234') {
        const userData = { username: 'test', nombre: 'Usuario Test' };
        const token = jwt.sign(userData, YOUR_SECRET_KEY, { expiresIn: '24h' });
        
        console.log('✅ Login exitoso para usuario test')
        return res.status(200).send({
            success: true,
            signed_user: userData,
            token: token
        });
    }

    // Intentar login con base de datos
    try {
        const pool = require('./mysql-connector');
        
        const query = 'SELECT usuario_id, nombre, usuario, contrasena, activo FROM usuarios WHERE usuario = ? AND activo = 1';
        
        pool.query(query, [username], (err, results) => {
            if (err) {
                console.error('❌ Error al consultar usuario:', err.message);
                return res.status(500).send({
                    errorMessage: 'Error interno del servidor'
                });
            }

            if (results.length === 0) {
                console.log('❌ Usuario no encontrado:', username)
                return res.status(403).send({
                    errorMessage: 'Usuario o contraseña incorrectos'
                });
            }

            const user = results[0];
            
            // Por ahora, comparación simple (sin bcrypt para testing)
            // En producción usar bcrypt.compare()
            if (password === 'password' || user.contrasena.includes(password)) {
                const userData = {
                    usuario_id: user.usuario_id,
                    username: user.usuario,
                    nombre: user.nombre
                };

                const token = jwt.sign(userData, YOUR_SECRET_KEY, { expiresIn: '24h' });
                
                console.log('✅ Login exitoso para:', username)
                res.status(200).send({
                    success: true,
                    signed_user: userData,
                    token: token
                });
            } else {
                console.log('❌ Contraseña incorrecta para:', username)
                res.status(403).send({
                    errorMessage: 'Usuario o contraseña incorrectos'
                });
            }
        });

    } catch (error) {
        console.error('❌ Error en login:', error.message);
        res.status(500).send({
            errorMessage: 'Error interno del servidor'
        });
    }
});

// Endpoint de registro básico
app.post('/register', (req, res) => {
    console.log('📝 Intento de registro:', req.body?.usuario)
    
    if (!req.body) {
        return res.status(400).send({
            success: false,
            errorMessage: 'Se requieren datos para el registro'
        });
    }

    const { nombre, correo, usuario, token, password } = req.body;

    // Validaciones básicas
    if (!nombre || !correo || !usuario || !token || !password) {
        return res.status(400).send({
            success: false,
            errorMessage: 'Todos los campos son requeridos'
        });
    }

    // Validar token simple (agregar más tokens según necesidad)
    const validTokens = ['SENSOR2025', 'IOT_ACCESS_TOKEN', 'ADMIN_INVITE_2025', 'DEMO_TOKEN'];
    if (!validTokens.includes(token)) {
        return res.status(403).send({
            success: false,
            errorMessage: 'Token de acceso inválido'
        });
    }

    try {
        const pool = require('./mysql-connector');
        
        // Verificar si el usuario ya existe
        const checkQuery = 'SELECT usuario_id FROM usuarios WHERE usuario = ? OR correo = ?';
        
        pool.query(checkQuery, [usuario, correo], (err, results) => {
            if (err) {
                console.error('❌ Error al verificar usuario:', err.message);
                return res.status(500).send({
                    success: false,
                    errorMessage: 'Error interno del servidor'
                });
            }

            if (results.length > 0) {
                console.log('❌ Usuario ya existe:', usuario)
                return res.status(409).send({
                    success: false,
                    errorMessage: 'El usuario o correo ya están registrados'
                });
            }

            // Insertar nuevo usuario (sin bcrypt por ahora para testing)
            const insertQuery = 'INSERT INTO usuarios (nombre, usuario, correo, contrasena, activo) VALUES (?, ?, ?, ?, 1)';
            
            pool.query(insertQuery, [nombre, usuario, correo, password], (insertErr, insertResults) => {
                if (insertErr) {
                    console.error('❌ Error al crear usuario:', insertErr.message);
                    return res.status(500).send({
                        success: false,
                        errorMessage: 'Error al crear el usuario'
                    });
                }

                const newUserId = insertResults.insertId;
                console.log('✅ Usuario creado exitosamente:', usuario, '(ID:', newUserId, ')')

                res.status(201).send({
                    success: true,
                    message: 'Usuario registrado exitosamente',
                    data: {
                        usuario_id: newUserId,
                        nombre: nombre,
                        usuario: usuario,
                        correo: correo
                    }
                });
            });
        });

    } catch (error) {
        console.error('❌ Error en registro:', error.message);
        res.status(500).send({
            success: false,
            errorMessage: 'Error interno del servidor'
        });
    }
});

// Endpoint para validar token
app.post('/validate-token', (req, res) => {
    const { token } = req.body;
    const validTokens = ['SENSOR2025', 'IOT_ACCESS_TOKEN', 'ADMIN_INVITE_2025', 'DEMO_TOKEN'];
    
    const isValid = validTokens.includes(token);
    
    res.status(200).send({
        valid: isValid,
        message: isValid ? 'Token válido' : 'Token inválido'
    });
});

// Endpoint protegido de prueba
app.get('/user-info', authenticator, (req, res) => {
    res.send({
        message: 'Endpoint protegido funcionando',
        timestamp: new Date().toISOString()
    });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error global:', err.message);
    res.status(500).send({
        errorMessage: 'Error interno del servidor'
    });
});

app.listen(PORT, function(req, res) {
    console.log(`🚀 NodeJS API corriendo en puerto ${PORT}`);
    console.log(`📊 Prueba: http://localhost:8000/`);
    console.log(`🔐 Login: POST http://localhost:8000/login`);
    console.log(`📝 Registro: POST http://localhost:8000/register`);
});

//=======[ End of file ]=======================================================