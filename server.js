const { Issuer, generators } = require('openid-client')
const { client_id, client_secret, redirect_uri } = require('./app.json')
const request = require('request-promise')
const express = require('express')
const cookieParser = require('cookie-parser')

const app = express()
const port = 80

app.use(cookieParser())

async function getClient() {
    const hubstaff = await Issuer.discover('https://account.hubstaff.com')

    return new hubstaff.Client({
        client_id,
        client_secret,
        redirect_uris: [redirect_uri],
        response_types: ['code'],
    })
}

app.get('/', (req, res) => {
    (async function() {
        const token = req.cookies.token;
        if (!token) return res.redirect('/login');
        const result = await request({
            uri: 'https://api.hubstaff.com/v2/users/me',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            }
        })
        console.log(result)
        res.send(result)
    })().then(console.log).catch(e => console.log(e))
})

app.get('/oauth', (req, res) => {
    if (req.query.error) return res.send(req.query.error_description);

    (async function() {
        const client = await getClient()
        const params = client.callbackParams(req)

        let token
        try {
            token = await client.grant({
                code: params.code,
                grant_type: 'authorization_code',
                redirect_uri: 'http://localhost/oauth',
            })

            res.cookie('token', token.access_token, {expires: new Date(token.expires_at * 1000)})
            res.send('logged in')
        } catch(e) {
            res.send(e.error_description)
        }
    })().then(console.log).catch(e => console.log(e))
})

app.get('/login', (req, res) => {
    (async function() {
        const client = await getClient()
        const nonce = generators.nonce()

        const req = client.authorizationUrl({
            scope: 'openid profile email hubstaff:read hubstaff:write',
            response_mode: 'form_post',
            nonce,
        })

        res.redirect(req)
    })().then(console.log).catch(e => console.log(e))
})

app.listen(port, () => console.log(`Listening on port ${port}!`))

