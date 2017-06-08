const cors = require('cors')
const express = require('express')
const expresssession = require('express-session')
const jsforce = require('jsforce')
const { json, urlencoded } = require('body-parser')
const path = require('path')

const port = process.env.PORT || '8080'

const oauth2 = new jsforce.OAuth2({
  loginUrl: process.env.OAUTH2_LOGIN_URL,
  clientId: process.env.OAUTH2_CLIENT_ID,
  clientSecret: process.env.OAUTH2_SECRET_ID,
  redirectUri: process.env.OAUTH2_REDIRECT_URI
})

const session = {
  secret: process.env.SESSION_SECRET || 'Brian is in the kitchen!',
  resave: false,
  saveUninitialized: true
}

const app = express()
  .use(cors())
  .use(urlencoded({ extended: false }))
  .use(json())
  .use(expresssession(session))

app.get('/', ({ session: { instanceUrl, accessToken } }, res) => {
  if (instanceUrl && accessToken) {
    res.sendFile(path.join(__dirname, 'index.html'))
  } else {
    res.redirect(oauth2.getAuthorizationUrl({ scope: 'api' }))
  }
})

app.get('/callback', ({ query: { code }, session }, res) => {
  const conn = new jsforce.Connection({ oauth2 })
  conn.authorize(code, (err, user) => {
    if (err) { return console.error(err) }
    session.instanceUrl = conn.instanceUrl
    session.accessToken = conn.accessToken
    res.redirect('/')
  })
})

app.get('/contacts', ({ session: { instanceUrl, accessToken } }, res) => {
  let contacts = []
  const conn = new jsforce.Connection({ oauth2, instanceUrl, accessToken })
  const query = conn
    .query('SELECT Id, Name, Account.Name, MobilePhone, Email, MailingStreet, MailingCity, MailingPostalCode FROM Contact')
    .on('record', (record) => {
      contacts.push(record)
    })
    .on('end', () => {
      res.send({ contacts })
    })
    .on('error', (err) => {
      console.error(err)
    })
    .run({ autoFetch : true, maxFetch : 4000 })
})

app.listen(port, () => console.log(`Server listening on port ${port}`))
