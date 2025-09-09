const express = require('express')

const routerSensores = express.Router()

var pool = require('../mysql-connector')

routerSensores.get('/sensores', function(req, res) {
    pool.query('Select * from Sensores', function(err, result, fields) {
        if (err) {
            res.send(err).status(400)
            return
        }
        res.send(result).status(200)
    })
})

module.exports = routerSensores