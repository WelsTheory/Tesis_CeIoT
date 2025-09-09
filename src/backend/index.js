var PORT    = 3000;

var express = require('express')
var cors = require('cors')
const jwt = require('jsonwebtoken')

const routerSensores = require('./sensores/index')

var app = express();
const corsOptions = {
    // Solo para desarrollo
    origin: '*',
}

const YOUR_SECRET_KEY = 'mi llave'
var testUser = {username: 'test', password: '1234'}

// to parse application/json
app.use(express.json()); 
// to serve static files
app.use(express.static('/home/node/app/static/'));


app.use(cors(corsOptions))

//=======[ Main module code ]==================================================
var authenticator = function (req, res, next) {
    let autHeader = (req.headers.authorization || '')
    if (autHeader.startsWith('Bearer ')) {
        token = autHeader.split(' ')[1]
    } else {
        res.status(401).send({ message: 'Se requiere un token de tipo Bearer' })
    }
    jwt.verify(token, YOUR_SECRET_KEY, function(err) {
      if(err) {
        res.status(403).send({ message: 'Token inválido' })
      }
    })
    next()
}

var cb0 = function (req, res, next) {
    console.log('CB0')
    next()
}

var cb1 = function (req, res, next) {
    console.log('CB1')
    next()
}

var cb2 = function (req, res, next) {
    res.send({'mensaje': 'Hola Wels!'}).status(200)
}

app.post('/login', (req, res) => {
    if (req.body) {
        var userData = req.body

        if (testUser.username === userData.username && testUser.password === userData.password) {
            var token = jwt.sign(userData, YOUR_SECRET_KEY)
            res.status(200).send({
                signed_user: userData,
                token: token
            })
        } else {
            res.status(403).send({
                errorMessage: 'Auth required'
            })
        }
    } else {
        res.status(403).send({
            errorMessage: 'Se requiere un usuario y contraseña'
        })
    }
})

app.get('/prueba', authenticator, function(req, res) {
    res.send({message: 'Está autenticado, accede a los datos'})
})

app.all('/secreto', function (req, res, next) {
    console.log(req.method)
    res.send('Secreto').status(200)
})

app.get('/', [cb0, cb1, cb2]);

app.use(authenticator, routerSensores)

// Agregar al archivo src/backend/index.js después del endpoint de login

const bcrypt = require('bcryptjs'); // Necesario instalar: npm install bcryptjs
const validator = require('validator'); // Necesario instalar: npm install validator

// Tokens de acceso válidos (esto debería venir de una base de datos o archivo de configuración)
const validTokens = [
    'SENSOR2025',
    'IOT_ACCESS_TOKEN',
    'ADMIN_INVITE_2025',
    // Agregar más tokens según sea necesario
];

// Endpoint para registro de usuarios
app.post('/register', async (req, res) => {
    try {
        // Validar que el body existe
        if (!req.body) {
            return res.status(400).send({
                success: false,
                errorMessage: 'Se requieren datos para el registro'
            });
        }

        const { nombre, correo, usuario, token, password } = req.body;

        // Validaciones básicas de campos requeridos
        if (!nombre || !correo || !usuario || !token || !password) {
            return res.status(400).send({
                success: false,
                errorMessage: 'Todos los campos son requeridos'
            });
        }

        // Validaciones de formato
        if (!validator.isEmail(correo)) {
            return res.status(400).send({
                success: false,
                errorMessage: 'El formato del correo electrónico es inválido'
            });
        }

        if (password.length < 8) {
            return res.status(400).send({
                success: false,
                errorMessage: 'La contraseña debe tener al menos 8 caracteres'
            });
        }

        if (usuario.length < 3) {
            return res.status(400).send({
                success: false,
                errorMessage: 'El nombre de usuario debe tener al menos 3 caracteres'
            });
        }

        if (nombre.length < 2) {
            return res.status(400).send({
                success: false,
                errorMessage: 'El nombre debe tener al menos 2 caracteres'
            });
        }

        // Validar token de acceso
        if (!validTokens.includes(token)) {
            return res.status(403).send({
                success: false,
                errorMessage: 'Token de acceso inválido. Contacte al administrador.'
            });
        }

        // Validar que el usuario no existe
        const pool = require('./mysql-connector');
        
        // Verificar si el usuario ya existe
        const checkUserQuery = 'SELECT usuario_id FROM usuarios WHERE usuario = ? OR correo = ?';
        
        pool.query(checkUserQuery, [usuario, correo], async (err, results) => {
            if (err) {
                console.error('Error al verificar usuario existente:', err);
                return res.status(500).send({
                    success: false,
                    errorMessage: 'Error interno del servidor'
                });
            }

            if (results.length > 0) {
                return res.status(409).send({
                    success: false,
                    errorMessage: 'El usuario o correo electrónico ya están registrados'
                });
            }

            try {
                // Encriptar la contraseña
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                // Insertar nuevo usuario
                const insertUserQuery = `
                    INSERT INTO usuarios (nombre, usuario, contrasena, correo, fecha_creacion, activo) 
                    VALUES (?, ?, ?, ?, NOW(), 1)
                `;

                pool.query(insertUserQuery, [nombre, usuario, hashedPassword, correo], (insertErr, insertResults) => {
                    if (insertErr) {
                        console.error('Error al crear usuario:', insertErr);
                        
                        // Verificar si es error de clave duplicada
                        if (insertErr.code === 'ER_DUP_ENTRY') {
                            return res.status(409).send({
                                success: false,
                                errorMessage: 'El usuario ya existe'
                            });
                        }

                        return res.status(500).send({
                            success: false,
                            errorMessage: 'Error al crear la cuenta de usuario'
                        });
                    }

                    // Usuario creado exitosamente
                    const newUserId = insertResults.insertId;
                    console.log(`Nuevo usuario creado: ${usuario} (ID: ${newUserId})`);

                    res.status(201).send({
                        success: true,
                        message: 'Usuario registrado exitosamente',
                        data: {
                            usuario_id: newUserId,
                            nombre: nombre,
                            usuario: usuario,
                            correo: correo,
                            fecha_creacion: new Date().toISOString()
                        }
                    });
                });

            } catch (hashError) {
                console.error('Error al encriptar contraseña:', hashError);
                return res.status(500).send({
                    success: false,
                    errorMessage: 'Error interno del servidor'
                });
            }
        });

    } catch (error) {
        console.error('Error en endpoint de registro:', error);
        res.status(500).send({
            success: false,
            errorMessage: 'Error interno del servidor'
        });
    }
});

// Endpoint para validar token de acceso (opcional - para validación en tiempo real)
app.post('/validate-token', (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).send({
            valid: false,
            message: 'Token requerido'
        });
    }

    const isValid = validTokens.includes(token);
    
    res.status(200).send({
        valid: isValid,
        message: isValid ? 'Token válido' : 'Token inválido'
    });
});

// Actualizar el endpoint de login para usar la base de datos
app.post('/login', (req, res) => {
    if (!req.body) {
        return res.status(400).send({
            errorMessage: 'Se requiere un usuario y contraseña'
        });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send({
            errorMessage: 'Usuario y contraseña son requeridos'
        });
    }

    // Conectar a la base de datos
    const pool = require('./mysql-connector');
    
    const query = 'SELECT usuario_id, nombre, usuario, contrasena, activo FROM usuarios WHERE usuario = ? AND activo = 1';
    
    pool.query(query, [username], async (err, results) => {
        if (err) {
            console.error('Error al consultar usuario:', err);
            return res.status(500).send({
                errorMessage: 'Error interno del servidor'
            });
        }

        if (results.length === 0) {
            return res.status(403).send({
                errorMessage: 'Usuario o contraseña incorrectos'
            });
        }

        const user = results[0];
        
        try {
            // Verificar la contraseña
            const passwordMatch = await bcrypt.compare(password, user.contrasena);
            
            if (!passwordMatch) {
                return res.status(403).send({
                    errorMessage: 'Usuario o contraseña incorrectos'
                });
            }

            // Crear token JWT
            const userData = {
                usuario_id: user.usuario_id,
                username: user.usuario,
                nombre: user.nombre
            };

            const token = jwt.sign(userData, YOUR_SECRET_KEY, { expiresIn: '24h' });
            
            res.status(200).send({
                success: true,
                signed_user: userData,
                token: token,
                message: 'Login exitoso'
            });

        } catch (compareError) {
            console.error('Error al verificar contraseña:', compareError);
            return res.status(500).send({
                errorMessage: 'Error interno del servidor'
            });
        }
    });
});

// Endpoint para obtener información del usuario autenticado
app.get('/user-info', authenticator, (req, res) => {
    // El token ya fue verificado por el middleware authenticator
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, YOUR_SECRET_KEY);
        
        // Consultar información actualizada del usuario
        const pool = require('./mysql-connector');
        const query = `
            SELECT u.usuario_id, u.nombre, u.usuario, u.correo, u.fecha_creacion,
                   COUNT(p.proyecto_id) as total_proyectos
            FROM usuarios u
            LEFT JOIN proyectos p ON u.usuario_id = p.usuario_id AND p.activo = 1
            WHERE u.usuario_id = ? AND u.activo = 1
            GROUP BY u.usuario_id
        `;
        
        pool.query(query, [decoded.usuario_id], (err, results) => {
            if (err) {
                console.error('Error al consultar información del usuario:', err);
                return res.status(500).send({
                    errorMessage: 'Error al obtener información del usuario'
                });
            }

            if (results.length === 0) {
                return res.status(404).send({
                    errorMessage: 'Usuario no encontrado'
                });
            }

            const userInfo = results[0];
            res.status(200).send({
                success: true,
                data: {
                    usuario_id: userInfo.usuario_id,
                    nombre: userInfo.nombre,
                    usuario: userInfo.usuario,
                    correo: userInfo.correo,
                    fecha_creacion: userInfo.fecha_creacion,
                    total_proyectos: userInfo.total_proyectos,
                    max_proyectos: 2
                }
            });
        });

    } catch (tokenError) {
        console.error('Error al decodificar token:', tokenError);
        return res.status(403).send({
            errorMessage: 'Token inválido'
        });
    }
});

// Endpoint para cambiar contraseña
app.post('/change-password', authenticator, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).send({
            success: false,
            errorMessage: 'Se requiere la contraseña actual y la nueva contraseña'
        });
    }

    if (newPassword.length < 8) {
        return res.status(400).send({
            success: false,
            errorMessage: 'La nueva contraseña debe tener al menos 8 caracteres'
        });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, YOUR_SECRET_KEY);

    const pool = require('./mysql-connector');
    
    // Obtener la contraseña actual del usuario
    const getUserQuery = 'SELECT contrasena FROM usuarios WHERE usuario_id = ? AND activo = 1';
    
    pool.query(getUserQuery, [decoded.usuario_id], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).send({
                success: false,
                errorMessage: 'Error al verificar usuario'
            });
        }

        try {
            // Verificar contraseña actual
            const passwordMatch = await bcrypt.compare(currentPassword, results[0].contrasena);
            
            if (!passwordMatch) {
                return res.status(403).send({
                    success: false,
                    errorMessage: 'La contraseña actual es incorrecta'
                });
            }

            // Encriptar nueva contraseña
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            
            // Actualizar contraseña en la base de datos
            const updateQuery = 'UPDATE usuarios SET contrasena = ?, fecha_actualizacion = NOW() WHERE usuario_id = ?';
            
            pool.query(updateQuery, [hashedNewPassword, decoded.usuario_id], (updateErr) => {
                if (updateErr) {
                    console.error('Error al actualizar contraseña:', updateErr);
                    return res.status(500).send({
                        success: false,
                        errorMessage: 'Error al actualizar la contraseña'
                    });
                }

                res.status(200).send({
                    success: true,
                    message: 'Contraseña actualizada exitosamente'
                });
            });

        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            return res.status(500).send({
                success: false,
                errorMessage: 'Error interno del servidor'
            });
        }
    });
});

app.listen(PORT, function(req, res) {
    console.log("NodeJS API running correctly");
});

//=======[ End of file ]=======================================================