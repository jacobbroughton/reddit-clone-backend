const express = require("express")
const cors = require("cors")
const app = express()
const cookieParser = require("cookie-parser")
const bodyParser = require("body-parser")
const session = require("express-session")
const { isAuth } = require("./middleware/authMiddleware")
const passport = require("passport")
require("dotenv").config()

let MySQLStore = require("express-mysql-session")(session)
let sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
})

app.use(
  cors({
    origin: ["https://zeddit.onrender.com", "https://zeddit.onrender.com/", "http://localhost:3000", "https://www.jacobbroughton.com"],
    credentials: true,
  })
)
app.use(cookieParser(process.env.cookieSecret));
app.use(express.json()); // parsing the incoming data
app.use(express.urlencoded({ extended: true })); // parsing the incoming data
app.use(
  session({
    store: sessionStore,
    secret: process.env.cookieSecret,
    proxy: true,
    saveUninitialized: true, // allows any uninitialized session to be sent to the store. When a session is created but not modified, it is referred to as uninitialized.
    resave: false, // enables the session to be stored back to the session store, even if the session was never modified during the request.
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // one day
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : false
    },
  })
)

require("./middleware/passportConfig")(passport)
app.use(passport.initialize())
app.use(passport.session())

app.get("/", isAuth, (req, res) => res.send("Hello world"))
app.use("/users", require("./routers/userRouter"))
app.use("/posts", require("./routers/postsRouter"))
app.use("/subreddits", require("./routers/subredditsRouter"))
app.use("/comments", require("./routers/commentsRouter"))
app.use("/votes", require("./routers/votesRouter"))
app.use("/search", require("./routers/searchRouter"))

const port = process.env.PORT || 5001

app.listen(port, () =>
  console.log(
    `Server is listening at port ${port} \n--------------------------------`
  )
)
